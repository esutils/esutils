import assert from 'assert';
import { DNS_PACKET_MAX_ERRORS, Packet } from '@esutils/dns-packet';

const brokenRequestHex =
  '5455d5d5d5d5d4d4d5545754d5d4d4d5555555d5d5d5d5d5d55555d5d5d5d5d5d5d5555555d5d5555555d5d4d4d5d555555555d5d5d5d5555555d5d5d5d5d5d5d5d5555455d5d4d55555d5d5d5d55555d5d5d5d5d5d5d555555455d5d5d5d5d5d5d5d55455d5d5d5d5d5d5d5d5d5d5d5d5d5d55555d5d5d4d555d5d555d5555555d5d4d5d55555d5d4d555545455d5d5d5d5d5d55555d5d5d4d555545455d5d5d555d5d5d5d5555455d5d5d5d5d5d5555555d5d555d5d5d5d555d5555555d5d4d4d5d5d555555555555455d5d5d5d5d5d5d5d5d5555555d555d5d5d5d5d5d5d5d555555555d5d5d5d5d5d5d555555555d5d5d5d5d5d5d5555455d5d5d555555555d5d5d5d5d5d555555455d5d5d5555455d5d5d4d5555455d5d4d4d555d5d555d5d5d5555555d5d5d4d5d5d555555555d5d5d5d55555d5d5d5d5d5d5d5d5d5555555d5d4d55555d5d5d4d5555555555555d555d55555d5d4d5555555d5d5d5d5d555545555d5d5d5555555d5d4d4d5555555d55555d555d5d5d5d5d5d5d55554545455d5d4d4d555555555d5d5d5d5d5d5555554d5d5d5d5d555545555d5555554d5d5d5d5d5d5d5d5d4d4d55455d5d5d4d5555555d5d4d455545455d5d5d5d5d555555555d5d5d5d555d5d5d5555555d5d5d5d5d5d5d5d55554555555d5d5d5555555d5d4d5d5d555d5d5d5555555d5d5d4d4d5555555d5d5d5d5555555d5d5d5d5d5d5d5d555555555d5d5d5d5d5d5d5d5d5d5d555d5d5d5d5d555d5d5d55555d5d5d5d5d5d5d5d555d5555455d5d5d5d5d555d5d5d5d5d55555d5d4d4d555545455d5d5d5d555d5d5d5d4d5d5d555d5d5d5d55555d5d5d5d5d5d5d555d5555555d5d5d5d5d5d5d5d55555d5d5d5d55555d5d5d5555455d5d5d5d5d5d5d555d5d5d555555554d5d4d4d555d55455d5d5d5d5d5d5d5d555555555545455d4d4d5555455d5d5d5d55555d5d5555455d5d4d4d4d5545454d5d4d4d5545455d4d4d555545455d5d5d4d4d55454d5d4d5d5d5d5d5d55555d5d555545455d5d5d5d5d5d5d5d5d5d5d5d5555555d5d5d555d5d555555555d5d5d5d555d5d5d5d5d5d55555d5d5d5d5d5d5';

describe('dns-packet broken request', () => {
  it('Packet#decode garbage buffer limits errors', function () {
    const buf = Buffer.from(brokenRequestHex, 'hex');
    const errors: string[] = [];
    const textDecoder = new TextDecoder();
    const decoded = Packet.decode(buf, textDecoder, errors);

    assert.ok(decoded.header.id === 21589);
    assert.deepEqual(errors.length, DNS_PACKET_MAX_ERRORS + 1);
    assert.equal(errors[DNS_PACKET_MAX_ERRORS], 'error count exceeded');
    assert.ok(
      errors.every((error) => !error.includes('DataView')),
      `unexpected DataView errors: ${errors.slice(0, 3).join(';')}`,
    );
  });

  it('Packet#encode empty packet succeeds', function () {
    const errors: string[] = [];
    const encoded = Packet.encode(
      Packet.create(),
      new TextEncoder(),
      errors,
    );
    assert.deepEqual(errors, []);
    assert.ok(encoded.length === 12);
  });

  it('Packet#encode decoded garbage buffer limits errors', function () {
    const buf = Buffer.from(brokenRequestHex, 'hex');
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    const decodeErrors: string[] = [];
    const decoded = Packet.decode(buf, textDecoder, decodeErrors);
    const encodeErrors: string[] = [];
    Packet.encode(decoded, textEncoder, encodeErrors);
    assert.deepEqual(encodeErrors.length, DNS_PACKET_MAX_ERRORS);
    assert.ok(encodeErrors.every((error) => error.startsWith('questions ')));
  });

  it('Packet#error limit keeps at most DNS_PACKET_MAX_ERRORS before exceeded', function () {
    assert.equal(DNS_PACKET_MAX_ERRORS, 16);
    const buf = Buffer.from(brokenRequestHex, 'hex');
    const errors: string[] = [];
    Packet.decode(buf, new TextDecoder(), errors);

    assert.equal(errors.length, DNS_PACKET_MAX_ERRORS + 1);
    assert.equal(errors[DNS_PACKET_MAX_ERRORS], 'error count exceeded');
    for (let i = 0; i < DNS_PACKET_MAX_ERRORS; i += 1) {
      assert.ok(errors[i].startsWith('decode questions'));
    }
  });
});
