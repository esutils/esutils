import assert from 'assert';
import { updateDomainsFromLine, checkDomains } from '../examples/dns-proxy-utils';

const lines = `
.github.blog
.github.com
.github.io
.raw.githubusercontent.com
.githubassets.com
.rawgithub.com
.githubusercontent.com
release-assets.githubusercontent.com 185.199.110.133
github.com 140.82.121.3
codeload.github.com 140.82.113.10
www.github.com 140.82.121.3
`.split(/\r\n|\n\r|\n|\r/);
test('Packet#decode', () => {
  const x = {};
  for (let i = 0; i < lines.length; i += 1) {
    updateDomainsFromLine(x, lines[i]);
  }
  console.log(x);
  assert.strictEqual(checkDomains(x, 'www.github.com'.split('.')), '140.82.121.3');
  assert.strictEqual(checkDomains(x, 'github.com'.split('.')), '140.82.121.3');
  assert.strictEqual(checkDomains(x, 'codeload.github.com'.split('.')), '140.82.113.10');
  assert.strictEqual(checkDomains(x, 'some_thing_else.github.com'.split('.')), true);
});
