import type * as net from 'net';

import { type AbortablePromise } from './abortable-promise';

export function readStream(
  abortablePromise: AbortablePromise<Uint8Array>,
  socket: net.Socket,
): Promise<Uint8Array | Error> {
  let chunks: Uint8Array[] = [];
  let chunklen = 0;
  let expectedCalculated = false;
  let expected = 0;
  return new Promise((resolve) => {
    let closed = false;
    function done() {
      if (!closed) {
        closed = true;
        socket.end();
      }
    }
    abortablePromise.abort = done;

    socket.on('end', () => {
      if (closed) {
        resolve(new Error('ClosedByAbort'));
      } else {
        closed = true;
        resolve(new Error('Closed'));
      }
    });
    socket.on('error', resolve);
    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      chunklen += chunk.length;
      if (!expectedCalculated && chunklen >= 2) {
        expectedCalculated = true;
        if (chunks.length > 1) {
          chunks = [ Buffer.concat(chunks, chunklen) ];
        }
        expected = Buffer.from(chunks[0]).readUInt16BE(0);
        chunks[0] = Uint8Array.prototype.slice.call(chunks[0], 2);
      }
      if (chunklen >= 2 + expected) {
        resolve(Buffer.concat(chunks, chunklen));
        done();
      }
    });
  });
}
