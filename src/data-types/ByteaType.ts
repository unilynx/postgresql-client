import decodeBytea from 'postgres-bytea';
import {DataType, DataTypeOIDs} from '../definitions';
import {SmartBuffer} from '../protocol/SmartBuffer';

export const ByteaType: DataType = {

    name: 'bytea',
    oid: DataTypeOIDs.Bytea,

    parseBinary(v: Buffer): Buffer {
        return v;
    },

    encodeBinary(buf: SmartBuffer, v: Buffer): void {
        buf.writeBuffer(v);
    },

    parseText: decodeBytea,

    isType(v: any): boolean {
        return v instanceof Buffer;
    }

}


export const ArrayByteaType: DataType = {
    ...ByteaType,
    name: '_bytea',
    oid: DataTypeOIDs.ArrayBytea,
    elementsOID: DataTypeOIDs.Bytea
}
