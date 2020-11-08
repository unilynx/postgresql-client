import {Protocol} from './protocol';
import {SASL} from './sasl';
import {SmartBuffer} from './SmartBuffer';
import {FetchOptions, Maybe, OID} from '../definitions';
import {DataTypeRegistry} from '../DataTypeRegistry';
import {encodeBinaryArray} from '../helpers/encode-binaryarray';
import {stringifyArrayLiteral} from '../helpers/stringify-arrayliteral';
import DataFormat = Protocol.DataFormat;

const StaticFlushBuffer = Buffer.from([Protocol.FrontendMessageCode.Flush, 0x00, 0x00, 0x00, 0x04]);
const StaticTerminateBuffer = Buffer.from([Protocol.FrontendMessageCode.Terminate, 0x00, 0x00, 0x00, 0x04]);
const StaticSyncBuffer = Buffer.from([Protocol.FrontendMessageCode.Sync, 0x00, 0x00, 0x00, 0x04]);

export namespace Frontend {

    export interface StartupMessageArgs {
        user: string;
        database: string;

        [index: string]: string;
    }

    export interface BindMessageArgs {
        statement?: string;
        portal?: string;
        paramTypes?: Maybe<OID>[];
        params?: any[];
        fetchOptions: FetchOptions;
    }

    export interface ParseMessageArgs {
        statement?: string;
        sql: string;
        paramTypes?: Maybe<OID>[];
    }

    export interface DescribeMessageArgs {
        type: 'P' | 'S';
        name?: string;
    }

    export interface ExecuteMessageArgs {
        portal?: string;
        fetchCount?: number;
    }

    export interface CloseMessageArgs {
        type: 'P' | 'S';
        name?: string;
    }

}

export class Frontend {
    private _io = new SmartBuffer(4096);

    reset(): void {
        this._io.reset();
    }

    getSSLRequestMessage(): Buffer {
        return this._io.reset()
            .writeUInt32BE(8) // Length of message contents in bytes, including self.
            .writeUInt16BE(1234)
            .writeUInt16BE(5679)
            .flush();
    }

    getStartupMessage(args: Frontend.StartupMessageArgs): Buffer {
        const io = this._io.reset()
            .writeInt32BE(0) // Preserve length
            .writeInt16BE(Protocol.VERSION_MAJOR)
            .writeInt16BE(Protocol.VERSION_MINOR);
        for (const [k, v] of Object.entries(args)) {
            if (k !== 'client_encoding')
                io.writeCString(k, 'utf8')
                    .writeCString(v, 'utf8');
        }
        io.writeCString('client_encoding', 'utf8')
            .writeCString('UTF8', 'utf8')
            .writeUInt8(0);

        return setLengthAndFlush(io, 0);
    }

    getPasswordMessage(password: string): Buffer {
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.PasswordMessage)
            .writeInt32BE(0) // Preserve header
            .writeCString(password, 'utf8');
        return setLengthAndFlush(io, 1);
    }

    getSASLMessage(sasl: SASL.Session): Buffer {
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.PasswordMessage)
            .writeInt32BE(0) // Preserve header
            .writeCString(sasl.mechanism, 'utf8')
            .writeLString(sasl.clientFirstMessage)
        return setLengthAndFlush(io, 1);
    }

    getSASLFinalMessage(session: SASL.Session): Buffer {
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.PasswordMessage)
            .writeInt32BE(0) // Preserve header
            .writeString(session.clientFinalMessage)
        return setLengthAndFlush(io, 1);
    }

    getParseMessage(args: Frontend.ParseMessageArgs): Buffer {
        if (args.statement && args.statement.length > 63)
            throw new Error('Query name length must be lower than 63');
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Parse)
            .writeInt32BE(0) // Preserve header
            .writeCString(args.statement || '', 'utf8')
            .writeCString(args.sql, 'utf8')
            .writeUInt16BE(args.paramTypes ? args.paramTypes.length : 0);
        if (args.paramTypes) {
            for (const t of args.paramTypes) {
                io.writeUInt32BE(t || 0);
            }
        }
        return setLengthAndFlush(io, 1);
    }

    getBindMessage(args: Frontend.BindMessageArgs): Buffer {
        if (args.portal && args.portal.length > 63)
            throw new Error('Portal name length must be lower than 63');
        if (args.statement && args.statement.length > 63)
            throw new Error('Query name length must be lower than 63');

        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Bind)
            .writeInt32BE(0) // Preserve header
            .writeCString(args.portal || '', 'utf8')
            .writeCString(args.statement || '', 'utf8');
        const {params, paramTypes, fetchOptions} = args;
        const columnFormat = fetchOptions.columnFormat != null ? fetchOptions.columnFormat:
            DataFormat.binary;

        if (params && params.length) {
            io.writeInt16BE(params.length);
            const formatOffset = io.offset;
            for (const v of params) {
                io.writeInt16BE(Protocol.DataFormat.text); // Preserve
            }

            // Write parameter values
            io.writeUInt16BE(params.length);
            for (let i = 0; i < params?.length; i++) {
                let v = params[i];
                if (v == null)
                    io.writeInt32BE(-1);

                const dataTypeOid = paramTypes ? paramTypes[i] : undefined;
                const dt = dataTypeOid ? DataTypeRegistry.items[dataTypeOid] : undefined;

                if (dt) {
                    if (typeof dt.type.encodeBinary === 'function') {
                        // Set param format to binary
                        io.buffer.writeInt16BE(Protocol.DataFormat.binary, formatOffset + (i * 2));
                        // Preserve data length
                        io.writeInt32BE(0);
                        const dataOffset = io.offset;
                        if (dt.isArray) {
                            v = Array.isArray(v) ? v : [v];
                            encodeBinaryArray(io, v, dt.elementsOid as OID, fetchOptions, dt.type.encodeBinary);
                        } else {
                            dt.type.encodeBinary(io, v, fetchOptions);
                        }
                        io.buffer.writeInt32BE(io.length - dataOffset, dataOffset - 4); // Update length
                    } else if (typeof dt.type.encodeText === 'function') {
                        v = dt.isArray ?
                            stringifyArrayLiteral(v, fetchOptions, dt.type.encodeText) :
                            dt.type.encodeText(v, fetchOptions);
                        io.writeLString(v, 'utf8');
                    }
                } else if (Buffer.isBuffer(v)) {
                    // Set param format to binary
                    io.buffer.writeInt16BE(Protocol.DataFormat.binary, formatOffset + (i * 2));
                    // Preserve data length
                    io.writeInt32BE(0);
                    const dataOffset = io.offset;
                    io.writeBuffer(v);
                    io.buffer.writeInt32BE(io.length - dataOffset, dataOffset - 4); // Update length
                } else {
                    io.writeLString('' + v, 'utf8');
                }
            }

        } else {
            io.writeUInt16BE(0);
            io.writeUInt16BE(0);
        }

        if (Array.isArray(columnFormat)) {
            io.writeUInt16BE(columnFormat.length);
            for (let i = 0; i < columnFormat.length; i++) {
                io.writeUInt16BE(columnFormat[i]);
            }
        } else if (columnFormat === DataFormat.binary) {
            io.writeUInt16BE(1);
            io.writeUInt16BE(DataFormat.binary);
        } else io.writeUInt16BE(0);

        return setLengthAndFlush(io, 1);
    }

    getDescribeMessage(args: Frontend.DescribeMessageArgs): Buffer {
        if (args.name && args.name.length > 63)
            throw new Error(args.type === 'P' ? 'Portal' : 'Statement' +
                'name length must be lower than 63');
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Describe)
            .writeInt32BE(0) // Preserve header
            .writeUInt8(args.type.charCodeAt(0))
            .writeCString(args.name || '', 'utf8');
        return setLengthAndFlush(io, 1);
    }

    getExecuteMessage(args: Frontend.ExecuteMessageArgs): Buffer {
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Execute)
            .writeInt32BE(0) // Preserve header
            .writeCString(args.portal || '', 'utf8')
            .writeUInt32BE(args.fetchCount || 0)
        return setLengthAndFlush(io, 1);
    }

    getCloseMessage(args: Frontend.CloseMessageArgs): Buffer {
        if (args.name && args.name.length > 63)
            throw new Error(args.type === 'P' ? 'Portal' : 'Statement' +
                'name length must be lower than 63');
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Close)
            .writeInt32BE(0) // Preserve header
            .writeUInt8(args.type.charCodeAt(0))
            .writeCString(args.name || '', 'utf8')
        return setLengthAndFlush(io, 1);
    }

    getQueryMessage(sql: string): Buffer {
        const io = this._io.reset()
            .writeInt8(Protocol.FrontendMessageCode.Query)
            .writeInt32BE(0) // Preserve header
            .writeCString(sql || '', 'utf8')
        return setLengthAndFlush(io, 1);
    }

    getFlushMessage(): Buffer {
        return StaticFlushBuffer;
    }

    getTerminateMessage(): Buffer {
        return StaticTerminateBuffer;
    }

    getSyncMessage(): Buffer {
        return StaticSyncBuffer;
    }

}

function setLengthAndFlush(io: SmartBuffer, lengthOffset: number): Buffer {
    io.buffer.writeUInt32BE(io.length - lengthOffset, lengthOffset);
    return io.flush();
}
