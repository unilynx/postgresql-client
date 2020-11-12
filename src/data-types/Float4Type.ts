import {DataType, DataTypeOIDs} from '../definitions';
import {SmartBuffer} from '../protocol/SmartBuffer';

export const Float4Type: DataType = {

    name: 'float4',
    oid: DataTypeOIDs.Float4,

    parseBinary(v: Buffer): number {
        return Math.round((v.readFloatBE(0) + Number.EPSILON) * 100) / 100;
    },

    encodeBinary(buf: SmartBuffer, v: number | string): void {
        buf.writeFloatBE(typeof v === 'number' ? v : parseFloat(v));
    },

    parseText: parseFloat,

    isType(v: any): boolean {
        return typeof v === 'number';
    }

}

export const ArrayFloat4Type: DataType = {
    ...Float4Type,
    name: '_float4',
    oid: DataTypeOIDs.ArrayFloat4,
    elementsOID: DataTypeOIDs.Float4
}
