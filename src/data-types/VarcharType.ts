import {DataType} from '../definitions';
import {SmartBuffer} from '../protocol/SmartBuffer';

export const VarcharType: DataType = {

    parseBinary(v: Buffer): string {
        return v.toString('utf8');
    },

    encodeBinary(buf: SmartBuffer, v: string): void {
        buf.writeString('' + v, 'utf8');
    },

    parseText(v): string {
        return '' + v;
    },

    isType(v: any): boolean {
        return typeof v === 'string';
    }

}
