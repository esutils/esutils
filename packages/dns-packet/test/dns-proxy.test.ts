import assert from 'assert';

import { TYPE, Packet } from '@esutils/dns-packet';

import {
  updateDomainsFromLine,
  checkDomains,
  dnsResponseAnswerUpdate,
} from '../examples/dns-proxy-utils';

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
 # www.bing.com 10.10.10.10
`.split(/\r\n|\n\r|\n|\r/);

test('dns-proxy checkDomains test', () => {
  const x = {};
  for (let i = 0; i < lines.length; i += 1) {
    updateDomainsFromLine(x, lines[i]);
  }
  console.log(x);
  assert.strictEqual(
    checkDomains(x, 'www.github.com'.split('.')),
    '140.82.121.3',
  );
  assert.strictEqual(checkDomains(x, 'www.unknow_site.com'.split('.')), false);
  assert.strictEqual(checkDomains(x, 'github.com'.split('.')), '140.82.121.3');
  assert.strictEqual(
    checkDomains(x, 'codeload.github.com'.split('.')),
    '140.82.113.10',
  );
  assert.strictEqual(
    checkDomains(x, 'some_thing_else.github.com'.split('.')),
    true,
  );
  assert.strictEqual(checkDomains(x, 'www.bing.com'.split('.')), false);
});

test('dns-proxy dnsResponseAnswerUpdate', () => {
  assert.equal(
    dnsResponseAnswerUpdate(
      'github.com',
      TYPE.A,
      Packet.create(),
      {
        resolved: '8.6.6.6;7.7.7.7',
        server: {
          tag: '',
          dnsList: [],
        },
      },
      {
        ip: '8.8.8.8',
        port: 53,
      },
    ),
    '8.8.8.8,github.com,A,7.7.7.7;8.6.6.6\n',
  );
  assert.equal(
    dnsResponseAnswerUpdate(
      'github.com',
      TYPE.A,
      Packet.create(),
      {
        resolved: '2001:4860:4860::8888',
        server: {
          tag: '',
          dnsList: [],
        },
      },
      {
        ip: '8.8.8.8',
        port: 53,
      },
    ),
    '8.8.8.8,github.com,A,\n',
  );

  assert.equal(
    dnsResponseAnswerUpdate(
      'github.com',
      TYPE.A,
      Packet.create(),
      {
        resolved: '2001:4860:4860::8888',
        server: {
          tag: '',
          dnsList: [],
        },
      },
      {
        ip: '8.8.8.8',
        port: 53,
      },
    ),
    '8.8.8.8,github.com,A,\n',
  );

  assert.equal(
    dnsResponseAnswerUpdate(
      'github.com',
      TYPE.AAAA,
      Packet.create(),
      {
        resolved: '2001:4860:4860::8888',
        server: {
          tag: '',
          dnsList: [],
        },
      },
      {
        ip: '8.8.8.8',
        port: 53,
      },
    ),
    '8.8.8.8,github.com,AAAA,2001:4860:4860::8888\n',
  );

  assert.equal(
    dnsResponseAnswerUpdate(
      'github.com',
      TYPE.ANY,
      Packet.create(),
      {
        resolved: '2001:4860:4860::8888;8.2.3.5',
        server: {
          tag: '',
          dnsList: [],
        },
      },
      {
        ip: '8.8.8.8',
        port: 53,
      },
    ),
    '8.8.8.8,github.com,ANY,8.2.3.5\n' +
      '8.8.8.8,github.com,ANY,2001:4860:4860::8888\n',
  );
});
