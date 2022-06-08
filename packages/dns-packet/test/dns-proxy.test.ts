import assert from 'assert';
import { updateDomainsFromLine, checkDomains } from '../examples/dns-proxy-utils';

test('Packet#decode', () => {
  const x = {};
  updateDomainsFromLine(x, '.githubusercontent.com 185.199.109.133');
  console.log(x);
  assert.strictEqual(checkDomains(x, 'raw.githubusercontent.com'.split('.')), '185.199.109.133');
});
