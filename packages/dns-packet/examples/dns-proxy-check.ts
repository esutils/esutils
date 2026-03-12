import * as dgram from 'dgram';

function sendUdpRequest(message: Uint8Array, port: number, host: string, timeout = 2000): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');

    // Set a timeout to prevent waiting forever
    const timer = setTimeout(() => {
      client.close();
      reject(new Error('UDP request timed out'));
    }, timeout);

    client.send(message, 0, message.length, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        client.close();
        reject(err);
      }
    });

    client.on('message', (msg) => {
      clearTimeout(timer);
      client.close();
      resolve(msg);
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      reject(err);
    });
  });
}

async function main() {
  // questions: [{ class: 1, name: 'bag.itunes.apple.com', type: 65 }],
  const buf1 = Buffer.from(
    '82d90100000100000000000003626167066974756e6573056170706c6503636f6d0000410001',
    'hex',
  ) as Uint8Array;
  try {
    const response = await sendUdpRequest(buf1, 55, '127.0.0.1', 10000);
    console.log(`Response: ${Buffer.from(response).toString("hex")}`);
  } catch (error) {
    console.error(`Error sending UDP request: ${error as Error}`);
  }
}

main();
