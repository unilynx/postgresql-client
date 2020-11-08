import assert from 'assert';
import '../_support/env';
import {
    Connection,
    BindParam,
    DataTypeOIDs,
    DataTypeRegistry,
    FetchOptions,
    escapeLiteral,
    stringifyValueForSQL
} from '../../src';
import {Protocol} from '../../src/protocol/protocol';

import DataFormat = Protocol.DataFormat;

describe('Data type encode/decode', function () {

    let connection: Connection;
    process.env.TZ = 'Europe/Istanbul';

    before(async () => {
        connection = new Connection(process.env.DB_URL);
        await connection.connect();
        await connection.execute('SET SESSION timezone TO \'Europe/Berlin\'');
    })

    after(async () => {
        process.env.TZ = '';
        await connection.close(0);
    })

    async function parseTest(dataTypeId: number, input: any[], output: any[],
                             opts: { columnFormat: DataFormat },
                             fetchOpts?: FetchOptions) {
        const reg = DataTypeRegistry.items[dataTypeId];
        if (!reg)
            throw new Error(`Data type "${dataTypeId}" is not registered.`);
        const typeName = reg.name;
        let sql;
        if (reg.isArray) {
            const s = stringifyValueForSQL(input, opts);
            sql = `select ${s}::${typeName} as f1`;
        } else {
            const inp = input.map(escapeLiteral);
            sql = 'select ' + inp.map((x: string, i: number) => `${x}::${typeName} as f${i + 1}`)
                .join(', ');
        }
        const resp = await connection.query(sql, {...fetchOpts, columnFormat: opts.columnFormat});
        assert.ok(resp && resp.rows);

        if (reg.isArray)
            assert.deepStrictEqual(resp.rows[0][0], output);
        else
            for (const [i, v] of output.entries()) {
                assert.deepStrictEqual(resp.rows[0][i], v);
            }
    }

    async function encodeTest(dataTypeId: number, input: any[], output?: any[],
                              fetchOpts?: FetchOptions) {
        const reg = DataTypeRegistry.items[dataTypeId];
        if (!reg)
            throw new Error(`Data type "0x${dataTypeId.toString(16)}" is not registered.`);
        let sql;
        let params;
        if (reg.isArray) {
            sql = 'select $1 as f1';
            params = [new BindParam(dataTypeId, input)];
        } else {
            sql = 'select ' + input.map((x, i) =>
                `\$${i + 1} as f${i + 1}`)
                .join(', ');
            params = input.map(v => new BindParam(dataTypeId, v));
        }
        const resp = await connection.query(sql, {...fetchOpts, params});
        assert.ok(resp && resp.rows);
        output = output === undefined ? input : output;
        if (reg.isArray)
            assert.deepStrictEqual(resp.rows[0][0], output);
        else
            for (const [i, v] of output.entries()) {
                assert.deepStrictEqual(resp.rows[0][i], v);
            }
    }

    /* ---------------- */
    it('should parse "bool" field (text)', async function () {
        await parseTest(DataTypeOIDs.Bool, ['true', 'false'], [true, false],
            {columnFormat: DataFormat.text});
    });

    it('should parse "bool" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Bool, ['true', 'false'], [true, false],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "bool" array field (text)', async function () {
        const input = [
            [[true, false, null], [false, true, null]],
            [[true, null, false], [null, false, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayBool, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "bool" array field (binary)', async function () {
        const arr = [
            [[true, false, null], [false, true, null]],
            [[true, null, false], [null, false, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayBool, arr, arr,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "bool" param', async function () {
        const input = [true, false];
        await encodeTest(DataTypeOIDs.Bool, input, input);
    });

    it('should encode "bool" array param', async function () {
        const input = [
            [[true, false], [false, true, true]],
            [[true], [null, false]]
        ];
        const output = [
            [[true, false, null], [false, true, true]],
            [[true, null, null], [null, false, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayBool, input, output);
    });

    /* ---------------- */

    it('should parse "int2" field (text)', async function () {
        await parseTest(DataTypeOIDs.Int2, ['1', '-2'], [1, -2],
            {columnFormat: DataFormat.text});
    });

    it('should parse "int2" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Int2, ['1', '-2'], [1, -2],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "int2" array field (text)', async function () {
        const input = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt2, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "int2" array field (binary)', async function () {
        const input = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt2, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "int2" param', async function () {
        await encodeTest(DataTypeOIDs.Int2, [-1, 5]);
    });

    it('should encode "int2" array param', async function () {
        const input = [
            [[-1, 5], [100, 150]],
            [[-10, 500, 0], [null, 2]]
        ];
        const output = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayInt2, input, output);
    });

    /* ---------------- */

    it('should parse "int4" field (text)', async function () {
        await parseTest(DataTypeOIDs.Int4, ['1', '-2'], [1, -2],
            {columnFormat: DataFormat.text});
    });

    it('should parse "int4" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Int4, ['1', '-2'], [1, -2],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "int4" array field (text)', async function () {
        const input = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt4, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "int4" array field (binary)', async function () {
        const input = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt4, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "int4" param', async function () {
        await encodeTest(DataTypeOIDs.Int4, [-1, 5]);
    });

    it('should encode "int4" array param', async function () {
        const input = [
            [[-1, 5], [100, 150]],
            [[-10, 500, 0], [null, 2]]
        ];
        const output = [
            [[-1, 5, null], [100, 150, null]],
            [[-10, 500, 0], [null, 2, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayInt4, input, output);
    });

    /* ---------------- */

    it('should parse "int8" field (text)', async function () {
        await parseTest(DataTypeOIDs.Int8, ['1', '-2'], [BigInt(1), -BigInt(2)],
            {columnFormat: DataFormat.text});
    });

    it('should parse "int8" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Int8, ['1', '-2'], [BigInt(1), -BigInt(2)],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "int8" array field (text)', async function () {
        const input = [
            [[-BigInt(1), BigInt(5), null], [BigInt(100), BigInt(150), null]],
            [[-BigInt(10), BigInt(500), BigInt(0)], [null, BigInt(2), null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt8, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "int8" array field (binary)', async function () {
        const input = [
            [[-BigInt(1), BigInt(5), null], [BigInt(100), BigInt(150), null]],
            [[-BigInt(10), BigInt(500), BigInt(0)], [null, BigInt(2), null]]
        ];
        await parseTest(DataTypeOIDs.ArrayInt8, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "int8" param', async function () {
        await encodeTest(DataTypeOIDs.Int8, [-BigInt(1), BigInt(5)]);
    });

    it('should encode "int8" array param', async function () {
        const input = [
            [[-BigInt(1), BigInt(5)], [BigInt(100), BigInt(150)]],
            [[-BigInt(10), BigInt(500), BigInt(0)], [null, BigInt(2)]]
        ];
        const output = [
            [[-BigInt(1), BigInt(5), null], [BigInt(100), BigInt(150), null]],
            [[-BigInt(10), BigInt(500), BigInt(0)], [null, BigInt(2), null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayInt8, input, output);
    });

    /* ---------------- */

    it('should parse "float4" field (text)', async function () {
        await parseTest(DataTypeOIDs.Float4, ['1.2', '-2.5'], [1.2, -2.5],
            {columnFormat: DataFormat.text});
    });

    it('should parse "float4" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Float4, ['1.25', '-2.5'], [1.25, -2.5],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "float4" array field (text)', async function () {
        const input = [
            [[-1.2, 5.2456, null], [0.9025, 150.42563, null]],
            [[-10.6, 500.422, 0], [null, 2.536322, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayFloat4, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "float4" array field (binary)', async function () {
        const input = [
            [[-1.25, 5.25, null], [0.8, 150.4, null]],
            [[-10.6, 500.4, 0], [null, 2.5, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayFloat4, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "float4" param', async function () {
        await encodeTest(DataTypeOIDs.Float4, [-1.2, 5.5]);
    });

    it('should encode "float4" array param', async function () {
        const input = [
            [[-1.25, 5.25], [0.9, 150.43]],
            [[-10.6, 500.42, 0], [null, 2.53]]
        ];
        const output = [
            [[-1.25, 5.25, null], [0.9, 150.43, null]],
            [[-10.6, 500.42, 0], [null, 2.53, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayFloat4, input, output);
    });

    /* ---------------- */
    it('should parse "float8" field (text)', async function () {
        await parseTest(DataTypeOIDs.Float8, ['1.2', '-2.5'], [1.2, -2.5],
            {columnFormat: DataFormat.text});
    });

    it('should parse "float8" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Float8, ['1.25', '-2.5'], [1.25, -2.5],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "float8" array field (text)', async function () {
        const input = [
            [[-1.2, 5.2456, null], [0.9025, 150.42563, null]],
            [[-10.6, 500.422, 0], [null, 2.536322, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayFloat8, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "float8" array field (binary)', async function () {
        const input = [
            [[-1.25, 5.25, null], [0.8, 150.4, null]],
            [[-10.6, 500.4, 0], [null, 2.5, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayFloat8, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "float8" param', async function () {
        await encodeTest(DataTypeOIDs.Float8, [-1.2, 5.5]);
    });

    it('should encode "float8" array param', async function () {
        const input = [
            [[-1.25, 5.2456], [0.9025, 150.42563]],
            [[-10.6, 500.422, 0], [null, 2.536322]]
        ];
        const output = [
            [[-1.25, 5.2456, null], [0.9025, 150.42563, null]],
            [[-10.6, 500.422, 0], [null, 2.536322, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayFloat8, input, output);
    });

    /* ---------------- */

    it('should parse "oid" field (text)', async function () {
        await parseTest(DataTypeOIDs.Oid, ['1', '2'], [1, 2],
            {columnFormat: DataFormat.text});
    });

    it('should parse "oid" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Oid, ['1', '2'], [1, 2],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "oid" array field (text)', async function () {
        const input = [
            [[1, 5, null], [100, 150, null]],
            [[10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayOid, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "oid" array field (binary)', async function () {
        const input = [
            [[1, 5, null], [100, 150, null]],
            [[10, 500, 0], [null, 2, null]]
        ];
        await parseTest(DataTypeOIDs.ArrayOid, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "oid" param', async function () {
        await encodeTest(DataTypeOIDs.Oid, [1, 5]);
    });

    it('should encode "oid" array param', async function () {
        const input = [
            [[1, 5], [100, 150]],
            [[10, 500, 0], [null, 2]]
        ];
        const output = [
            [[1, 5, null], [100, 150, null]],
            [[10, 500, 0], [null, 2, null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayOid, input, output);
    });
    /* ---------------- */

    it('should parse "char" field (text)', async function () {
        await parseTest(DataTypeOIDs.Char, ['abc', 'bcd'], ['a', 'b'],
            {columnFormat: DataFormat.text});
    });

    it('should parse "char" field (binary)', async function () {
        await parseTest(DataTypeOIDs.Char, ['abc', 'bcd'], ['a', 'b'],
            {columnFormat: DataFormat.binary});
    });

    it('should parse "char" array field (text)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        const output = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'f', 'j'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayChar, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "char" array field (binary)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        const output = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'f', 'j'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayChar, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "char" param', async function () {
        await encodeTest(DataTypeOIDs.Char, ['abc', 'bcd'], ['a', 'b']);
    });

    it('should encode "char" array param', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        const output = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'f', 'j'], [null, 'h', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayChar, input, output);
    });

    /* ---------------- */

    it('should parse "bpchar" field (text)', async function () {
        const input = ['abc', 'bcd'];
        await parseTest(DataTypeOIDs.Bpchar, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "bpchar" field (binary)', async function () {
        const input = ['abc', 'bcd'];
        await parseTest(DataTypeOIDs.Bpchar, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "bpchar" array field (text)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayBpchar, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "bpchar" array field (binary)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayBpchar, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "bpchar" param', async function () {
        await encodeTest(DataTypeOIDs.Bpchar, ['abc', 'bcd']);
    });

    it('should encode "bpchar" array param', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayBpchar, input);
    });

    /* ---------------- */

    it('should parse "varchar" field (text)', async function () {
        const input = ['abc"\'', 'bcd'];
        await parseTest(DataTypeOIDs.Varchar, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "varchar" field (binary)', async function () {
        const input = ['abc"\'', 'bcd'];
        await parseTest(DataTypeOIDs.Varchar, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "varchar" array field (text)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayVarchar, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "varchar" array field (binary)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayVarchar, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "varchar" param', async function () {
        await encodeTest(DataTypeOIDs.Varchar, ['abc', 'bcd']);
    });

    it('should encode "varchar" array param', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayVarchar, input);
    });

    /* ---------------- */

    it('should parse "text" field (text)', async function () {
        const input = ['abc', 'bcd'];
        await parseTest(DataTypeOIDs.Text, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "text" field (binary)', async function () {
        const input = ['abc', 'bcd'];
        await parseTest(DataTypeOIDs.Text, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "text" array field (text)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayText, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "text" array field (binary)', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayText, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "text" param', async function () {
        const input = ['abc', 'bcd'];
        await encodeTest(DataTypeOIDs.Text, input, input);
    });

    it('should encode "text" array param', async function () {
        const input = [
            [['a', 'b', null], ['c', 'd', null]],
            [['e', 'fg', 'jkl'], [null, 'h', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayText, input, input);
    });

    /* ---------------- */
    it('should parse "xml" field (text)', async function () {
        const input = ['<tag>1</tag>', '<tag>2</tag>'];
        await parseTest(DataTypeOIDs.Xml, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "xml" field (binary)', async function () {
        const input = ['<tag>1</tag>', '<tag>2</tag>'];
        await parseTest(DataTypeOIDs.Xml, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "xml" array field (text)', async function () {
        const input = [
            [['<tag>1</tag>', '<tag>2</tag>', null], ['<tag>3</tag>', '<tag>4</tag>', null]],
            [['<tag>5</tag>', '<tag>6</tag>', '<tag>7</tag>'], [null, '<tag>8</tag>', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayXml, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "xml" array field (binary)', async function () {
        const input = [
            [['<tag>1</tag>', '<tag>2</tag>', null], ['<tag>3</tag>', '<tag>4</tag>', null]],
            [['<tag>5</tag>', '<tag>6</tag>', '<tag>7</tag>'], [null, '<tag>8</tag>', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayXml, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "xml" param', async function () {
        await encodeTest(DataTypeOIDs.Xml, ['abc', 'bcd']);
    });

    it('should encode "xml" array param', async function () {
        const input = [
            [['<tag>1</tag>', '<tag>2</tag>', null], ['<tag>3</tag>', '<tag>4</tag>', null]],
            [['<tag>5</tag>', '<tag>6</tag>', '<tag>7</tag>'], [null, '<tag>8</tag>', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayXml, input);
    });

    /* ---------------- */

    it('should parse "json" field (text)', async function () {
        const input = ['{"a": 1}', '{"a": 2}'];
        await parseTest(DataTypeOIDs.Json, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "json" field (binary)', async function () {
        const input = ['{"a": 1}', '{"a": 2}'];
        await parseTest(DataTypeOIDs.Json, input, input,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "json" array field (text)', async function () {
        const input = [
            [['{"a": 1}', '{"a": 2}', null], ['{"a": 3}', '{"a": 4}', null]],
            [['{"a": 5}', '{"a": 6}', '{"a": 7}'], [null, '{"a": 8}', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayJson, input, input,
            {columnFormat: DataFormat.text});
    });

    it('should parse "json" array field (binary)', async function () {
        const input = [
            [['{"a": 1}', '{"a": 2}', null], ['{"a": 3}', '{"a": 4}', null]],
            [['{"a": 5}', '{"a": 6}', '{"a": 7}'], [null, '{"a": 8}', null]]
        ];
        const output = [
            [['{"a": 1}', '{"a": 2}', null], ['{"a": 3}', '{"a": 4}', null]],
            [['{"a": 5}', '{"a": 6}', '{"a": 7}'], [null, '{"a": 8}', null]]
        ];
        await parseTest(DataTypeOIDs.ArrayJson, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "json" param', async function () {
        const input = [{a: 1}, {a: 2}];
        const output = ['{"a":1}', '{"a":2}'];
        await encodeTest(DataTypeOIDs.Json, input, output);
    });

    it('should encode "json" array param', async function () {
        const input = [
            [['{"a":1}', '{"a":2}'], [{"a": 3}, {"a": 4}]],
            [['{"a":5}', '{"a":6}', '{"a":7}'], [null, {"a": 8}]]
        ];
        const output = [
            [['{"a":1}', '{"a":2}', null], ['{"a":3}', '{"a":4}', null]],
            [['{"a":5}', '{"a":6}', '{"a":7}'], [null, '{"a":8}', null]]
        ];
        await encodeTest(DataTypeOIDs.ArrayJson, input, output);
    });

    /* ---------------- */

    it('should parse "date" field (text)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Date, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "date" field (text, utcDates)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T00:00:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Date, input, output,
            {columnFormat: DataFormat.text}, {utcDates: true});
    });

    it('should parse "date" field (binary)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Date, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "date" field (binary, utcDates)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00Z',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T00:00:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Date, input, output,
            {columnFormat: DataFormat.binary}, {utcDates: true});
    });

    it('should parse "date" array field (text)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayDate, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "date" array field (binary)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayDate, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "date" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Date, input, output);
    });

    it('should encode "date" param (utcDates)', async function () {
        const input = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T00:00:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Date, input, output, {utcDates: true});
    });

    it('should encode array "date" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T00:00:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.ArrayDate, input, output);
    });

    /* ---------------- */

    it('should parse "timestamp" field (text)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            '2020-10-22T23:45:00+03:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamp, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "timestamp" field (text, utcDates)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            '2020-10-22T23:45:00+03:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamp, input, output,
            {columnFormat: DataFormat.text}, {utcDates: true});
    });

    it('should parse "timestamp" field (binary)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            '2020-10-22T23:45:00+03:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamp, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "timestamp" field (binary, utcDates)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            '2020-10-22T23:45:00+03:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamp, input, output,
            {columnFormat: DataFormat.binary}, {utcDates: true});
    });

    it('should parse "timestamp" array field (text)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            '2020-10-22T23:45:00+03:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayTimestamp, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "timestamp" array field (binary)', async function () {
        const input = [
            '2020-10-22',
            '2020-10-22T23:45:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayTimestamp, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "timestamp" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Timestamp, input, output);
    });

    it('should encode "timestamp" param (utcDates)', async function () {
        const input = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00Z'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Timestamp, input, output, {utcDates: true});
    });

    it('should encode array "timestamp" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        const output = [
            new Date('2020-10-22T00:00:00'),
            new Date('2020-10-22T23:45:00'),
            new Date('1970-01-01T00:00:00'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.ArrayTimestamp, input, output);
    });

    /* ---------------- */

    it('should parse "timestamptz" field (text)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamptz, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "timestamptz" field (text, utcDates)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamptz, input, output,
            {columnFormat: DataFormat.text}, {utcDates: true});
    });

    it('should parse "timestamptz" field (binary)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamptz, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "timestamptz" field (binary, utcDates)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.Timestamptz, input, output,
            {columnFormat: DataFormat.binary}, {utcDates: true});
    });

    it('should parse "timestamptz" array field (text)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayTimestamptz, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "timestamptz" array field (binary)', async function () {
        const input = [
            '2020-10-22T23:45:00Z',
            '2020-10-22T23:45:00+01:00',
            'epoch', 'infinity', '-infinity',
        ];
        const output = [
            new Date('2020-10-22T23:45:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await parseTest(DataTypeOIDs.ArrayTimestamptz, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "timestamptz" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Timestamptz, input);
    });

    it('should encode "timestamptz" param (utcDates)', async function () {
        const input = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.Timestamptz, input, undefined, {utcDates: true});
    });

    it('should encode array "timestamp" param', async function () {
        const input = [
            new Date('2020-10-22T00:00:00Z'),
            new Date('2020-10-22T23:45:00+01:00'),
            new Date('1970-01-01T00:00:00Z'),
            Infinity, -Infinity,
        ];
        await encodeTest(DataTypeOIDs.ArrayTimestamptz, input);
    });

    /* ---------------- */

    it('should parse "bytea" field (text)', async function () {
        const input = ['ABCDE', 'FGHIJ'];
        const output = [
            Buffer.from([65, 66, 67, 68, 69]),
            Buffer.from([70, 71, 72, 73, 74])
        ];
        await parseTest(DataTypeOIDs.Bytea, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "bytea" field (binary)', async function () {
        const input = ['ABCDE', 'FGHIJ'];
        const output = [
            Buffer.from([65, 66, 67, 68, 69]),
            Buffer.from([70, 71, 72, 73, 74])
        ];
        await parseTest(DataTypeOIDs.Bytea, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "bytea" array field (text)', async function () {
        const input = ['ABCDE', 'FGHIJ'];
        const output = [
            Buffer.from([65, 66, 67, 68, 69]),
            Buffer.from([70, 71, 72, 73, 74])
        ];
        await parseTest(DataTypeOIDs.ArrayBytea, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "bytea" array field (binary)', async function () {
        const input = ['ABCDE', 'FGHIJ'];
        const output = [
            Buffer.from([65, 66, 67, 68, 69]),
            Buffer.from([70, 71, 72, 73, 74])
        ];
        await parseTest(DataTypeOIDs.ArrayBytea, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "bytea" param', async function () {
        const input = [
            Buffer.from([195, 158, 65, 68, 66, 69, 69, 70]),
            Buffer.from([195, 158, 65, 68, 66, 69, 69, 71])
        ];
        await encodeTest(DataTypeOIDs.Bytea, input, input);
    });

    it('should encode "bytea" array param', async function () {
        const input = [
            Buffer.from([195, 158, 65, 68, 66, 69, 69, 70]),
            Buffer.from([195, 158, 65, 68, 66, 69, 69, 71])
        ];
        await encodeTest(DataTypeOIDs.ArrayBytea, input);
    });

    /* ---------------- */

    it('should parse "point" field (text)', async function () {
        const input = ['(-1.2, 3.5)', '2.1, 6.3'];
        const output = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await parseTest(DataTypeOIDs.Point, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "point" field (binary)', async function () {
        const input = ['(-1.2, 3.5)', '2.1, 6.3'];
        const output = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await parseTest(DataTypeOIDs.Point, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "point" array field (text)', async function () {
        const input = ['(-1.2, 3.5)', '2.1, 6.3'];
        const output = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await parseTest(DataTypeOIDs.ArrayPoint, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "point" array field (binary)', async function () {
        const input = ['(-1.2, 3.5)', '2.1, 6.3'];
        const output = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await parseTest(DataTypeOIDs.ArrayPoint, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "point" param', async function () {
        const input = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await encodeTest(DataTypeOIDs.Point, input, input);
    });

    it('should encode "point" array param', async function () {
        const input = [{x: -1.2, y: 3.5}, {x: 2.1, y: 6.3}];
        await encodeTest(DataTypeOIDs.ArrayPoint, input);
    });

    /* ---------------- */

    it('should parse "circle" field (text)', async function () {
        const input = [
            '<(-1.2, 3.5), 4.6>',
            '((1.2, 3.5), 4.5)',
            '(6.2, -3.0), 7.2',
            '1.1, 3.9, 8.6'];
        const output = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await parseTest(DataTypeOIDs.Circle, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "circle" field (binary)', async function () {
        const input = [
            '<(-1.2, 3.5), 4.6>',
            '((1.2, 3.5), 4.5)',
            '(6.2, -3.0), 7.2',
            '1.1, 3.9, 8.6'];
        const output = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await parseTest(DataTypeOIDs.Circle, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "circle" array field (text)', async function () {
        const input = [
            '<(-1.2, 3.5), 4.6>',
            '((1.2, 3.5), 4.5)',
            '(6.2, -3.0), 7.2',
            '1.1, 3.9, 8.6'];
        const output = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await parseTest(DataTypeOIDs.ArrayCircle, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "circle" array field (binary)', async function () {
        const input = [
            '<(-1.2, 3.5), 4.6>',
            '((1.2, 3.5), 4.5)',
            '(6.2, -3.0), 7.2',
            '1.1, 3.9, 8.6'];
        const output = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await parseTest(DataTypeOIDs.ArrayCircle, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "circle" param', async function () {
        const input = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await encodeTest(DataTypeOIDs.Circle, input, input);
    });

    it('should encode "circle" array param', async function () {
        const input = [
            {x: -1.2, y: 3.5, r: 4.6},
            {x: 1.2, y: 3.5, r: 4.5},
            {x: 6.2, y: -3, r: 7.2},
            {x: 1.1, y: 3.9, r: 8.6}];
        await encodeTest(DataTypeOIDs.ArrayCircle, input);
    });

    /* ---------------- */

    it('should parse "lseg" field (text)', async function () {
        const input = [
            '[(1.2, 3.5), (4.6, 5.2)]',
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.Lseg, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "lseg" field (binary)', async function () {
        const input = [
            '[(1.2, 3.5), (4.6, 5.2)]',
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.Lseg, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "lseg" array field (text)', async function () {
        const input = [
            '[(1.2, 3.5), (4.6, 5.2)]',
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.ArrayLseg, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "lseg" array field (binary)', async function () {
        const input = [
            '[(1.2, 3.5), (4.6, 5.2)]',
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.ArrayLseg, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "lseg" param', async function () {
        const input = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await encodeTest(DataTypeOIDs.Lseg, input, input);
    });

    it('should encode "lseg" array param', async function () {
        const input = [
            {x1: 1.2, y1: 3.5, x2: 4.6, y2: 5.2},
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await encodeTest(DataTypeOIDs.ArrayLseg, input);
    });

    /* ---------------- */

    it('should parse "box" field (text)', async function () {
        const input = [
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.Box, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "box" field (binary)', async function () {
        const input = [
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.Box, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should parse "box" array field (text)', async function () {
        const input = [
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.ArrayBox, input, output,
            {columnFormat: DataFormat.text});
    });

    it('should parse "box" array field (binary)', async function () {
        const input = [
            '((-1.6, 3.0), (4.6, 0.1))',
            '(4.2, 3.5), (4.6, 9.7)',
            '10.24, 40.1, 4.6, 8.2'];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await parseTest(DataTypeOIDs.ArrayBox, input, output,
            {columnFormat: DataFormat.binary});
    });

    it('should encode "box" param', async function () {
        const input = [
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await encodeTest(DataTypeOIDs.Box, input, output);
    });

    it('should encode "box" array param', async function () {
        const input = [
            {x1: -1.6, y1: 3, x2: 4.6, y2: 0.1},
            {x1: 4.2, y1: 3.5, x2: 4.6, y2: 9.7},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        const output = [
            {x1: 4.6, y1: 3, x2: -1.6, y2: 0.1},
            {x1: 4.6, y1: 9.7, x2: 4.2, y2: 3.5},
            {x1: 10.24, y1: 40.1, x2: 4.6, y2: 8.2}];
        await encodeTest(DataTypeOIDs.ArrayBox, input, output);
    });

});
