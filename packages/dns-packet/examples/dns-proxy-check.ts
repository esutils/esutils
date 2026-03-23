import { type DnsQueryProtocolType, queryDnsBuffer } from './dns-query';

async function fetchDns(requestHex: string) {
  const requestHexParts = requestHex.split('#');
  let serverIp = '127.0.0.1';
  let serverPort = 55;
  let protocolType: DnsQueryProtocolType = 'udp';
  if (requestHexParts.length >= 2) {
    requestHex = requestHexParts[0];
    serverIp = requestHexParts[1];
    serverPort = 53;
    if (requestHexParts.length === 3) {
      protocolType = requestHexParts[2] as DnsQueryProtocolType;
    }
  }
  const requestBuffer = Buffer.from(requestHex, 'hex') as Uint8Array;
  try {
    const result = queryDnsBuffer(requestBuffer, protocolType, {
      ip: serverIp,
      port: serverPort,
    });
    setTimeout(() => {
      if (result.abort) {
        result.abort();
      }
    }, 3000);
    const response = await result.promise;
    if (response instanceof Uint8Array) {
      console.log(`Response for ${serverIp}:${serverPort} ${protocolType}: ${Buffer.from(response).toString('hex')}`);
    } else {
      console.error(`Error sending UDP request: ${response}`);
    }
  } catch (error) {
    console.error(`Error sending UDP request: ${error as Error}`);
  }
}

async function main() {
  const requestListExternal = [
    // nslookup -type=any bing.com 180.76.76.76
    '0001010000010000000000000237360237360237360331383007696e2d61646472046172706100000c0001#180.76.76.76',
    '0002010000010000000000000462696e6703636f6d0000ff0001#180.76.76.76',

    // nslookup -type=any bing.com 9.9.9.9
    '0002010000010000000000000462696e6703636f6d0000ff0001#9.9.9.9#tcp',

    // nslookup -port=53 -type=any google.com 8.8.8.8
    '000101000001000000000000013801380138013807696e2d61646472046172706100000c0001#8.8.8.8',
    '00020100000100000000000006676f6f676c6503636f6d0000ff0001#8.8.8.8#tcp',
  ];

  const requestListSelf = [
    // Request dns for type: A domain:'api.smoot.apple.cn' Not supported DNS TYPE DNAME:39
    '1dc5010000010000000000000361706905736d6f6f74056170706c6502636e0000010001',

    // dig bing.com TXT
    'e07b012000010000000000010462696e6703636f6d000010000100002904d000000000000c000a00084d4fe6ac32a34e1c',
    // dig hinfo.network SOA
    '0844012000010000000000010568696e666f076e6574776f726b000006000100002904d000000000000c000a00081327d9418e13f714',
    // dig hinfo.network RRSIG
    '8de8012000010000000000010568696e666f076e6574776f726b00002e000100002904d000000000000c000a0008e483db10b904b74d',
    // dig hinfo.network HINFO
    'd954012000010000000000010568696e666f076e6574776f726b00000d000100002904d000000000000c000a0008dadd41236b959968',
    // dig hinfo.network CDNSKEY
    'cd5f012000010000000000010568696e666f076e6574776f726b00003c000100002904d000000000000c000a000851e8e9996bd4a6bc',
    // dig hinfo.network DNSKEY
    'ee13012000010000000000010568696e666f076e6574776f726b000030000100002904d000000000000c000a000859109a9d1a77391d',
    // dig hinfo.network CDS
    '648b012000010000000000010568696e666f076e6574776f726b00003b000100002904d000000000000c000a00086269bc9093a6a5ce',
    // dig hinfo.network A
    'aaae012000010000000000010568696e666f076e6574776f726b000001000100002904d000000000000c000a00080cce7d4c9bdb65cf',
    // dig hinfo.network NS
    'c7cd012000010000000000010568696e666f076e6574776f726b000002000100002904d000000000000c000a000865df56dc4e107b22',
    // dig hinfo.network HTTPS
    'de6a012000010000000000010568696e666f076e6574776f726b000041000100002904d000000000000c000a0008d26266fd3bf957af',
    // dig hinfo.network MX
    '8eab012000010000000000010568696e666f076e6574776f726b00000f000100002904d000000000000c000a0008ca25946943d9b008',
    // dig hinfo.network TXT
    '8e56012000010000000000010568696e666f076e6574776f726b000010000100002904d000000000000c000a0008cbee6f1145347e80',
    // dig hinfo.network SOA
    'bfa8012000010000000000010568696e666f076e6574776f726b000006000100002904d000000000000c000a0008698e24781592c7a7',
    // dig hinfo.network NSEC
    '90a6012000010000000000010568696e666f076e6574776f726b00002f000100002904d000000000000c000a0008a464689b72557e72',
    // sipdbz09.rcs01.5gm.wo.cn TYPE NAPTR:35
    '38de010000010000000000000873697064627a30390572637330310335676d02776f02636e0000230001',
    // _http._tcp.security.debian.org TYPE SRV:33
    'ff9a01000001000000000000055f68747470045f7463700873656375726974790664656269616e036f72670000210001',
    // _https._tcp.download.docker.com TYPE SRV:33
    '21c401000001000000000000065f6874747073045f74637008646f776e6c6f616406646f636b657203636f6d0000210001',
    // dig sipdbz09.rcs01.5gm.wo.cn TYPE A:1 optionCode 10: optionLength:8
    '5cdd012000010000000000010873697064627a30390572637330310335676d02776f02636e000001000100002904d000000000000c000a00085e7f28497d1e0722',
    // dap.pat-issuer.cloudflare.com TYPE HTTPS:65
    '00c801000001000000000000036461700a7061742d6973737565720a636c6f7564666c61726503636f6d0000410001',
  ];
  for (const requestHex of requestListExternal) {
    await fetchDns(requestHex);
  }
  process.exit(0);
  for (const requestHex of requestListSelf) {
    await fetchDns(requestHex);
  }
}

main();
