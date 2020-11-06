import {DataType} from '../definitions';
import {SmartBuffer} from '../protocol/SmartBuffer';
import {fastParseInt} from '../helpers/fast-parseint';

export const Int2Type: DataType = {

    parseBinary(v: Buffer): number {
        return v.readInt16BE(0);
    },

    encodeBinary(buf: SmartBuffer, v: number): void {
        buf.writeInt16BE(fastParseInt(v));
    },

    parseText: fastParseInt,

    isType(v: any): boolean {
        return typeof v === 'number' &&
            Number.isInteger(v) && v >= -32768 && v <= 32767;
    }

}
