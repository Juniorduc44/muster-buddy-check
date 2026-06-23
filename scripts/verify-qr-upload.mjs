import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { createWorker } from 'qr-scanner/qr-scanner-worker.min.js';

const receipt = '0123456789abcdef'.repeat(4);
const genericQr = 'MusterSheets scanner test';
const denseQr = `https://example.com/verify?receipt=${receipt}&sheet=${'abcdef0123456789'.repeat(2)}`;

const loadWorkerSource = async () => {
  let sourcePromise;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalWorker = globalThis.Worker;

  URL.createObjectURL = (blob) => {
    sourcePromise = blob.text();
    return 'blob:qr-scanner-test';
  };
  globalThis.Worker = class {};

  try {
    createWorker();
    return await sourcePromise;
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
    globalThis.Worker = originalWorker;
  }
};

const renderQr = (payload, pageWidth, pageHeight, qrPixels, margin = 4) => {
  const rgba = new Uint8ClampedArray(pageWidth * pageHeight * 4).fill(255);
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' }).modules;
  const moduleSize = Math.floor(qrPixels / (qr.size + margin * 2));
  const renderedSize = moduleSize * (qr.size + margin * 2);
  const left = Math.floor((pageWidth - renderedSize) / 2);
  const top = Math.floor((pageHeight - renderedSize) / 2);

  for (let row = 0; row < qr.size; row++) {
    for (let column = 0; column < qr.size; column++) {
      if (!qr.get(row, column)) continue;
      const startX = left + (column + margin) * moduleSize;
      const startY = top + (row + margin) * moduleSize;

      for (let y = startY; y < startY + moduleSize; y++) {
        for (let x = startX; x < startX + moduleSize; x++) {
          const offset = (y * pageWidth + x) * 4;
          rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 0;
        }
      }
    }
  }

  return { data: rgba, width: pageWidth, height: pageHeight };
};

const workerSource = await loadWorkerSource();
let workerResult;
const self = {
  close() {},
  postMessage(message) {
    workerResult = message;
  },
};
new Function('self', workerSource)(self);

const decode = (image, id) => {
  self.onmessage({ data: { id, type: 'inversionMode', data: 'both' } });
  self.onmessage({ data: { id, type: 'decode', data: image } });
  return workerResult?.data;
};

assert.equal(decode(renderQr(receipt, 320, 320, 320), 1), receipt, 'standalone receipt QR');
assert.equal(decode(renderQr(receipt, 1200, 900, 360), 2), receipt, 'receipt QR in a document image');
assert.equal(decode(renderQr(genericQr, 320, 320, 320), 3), genericQr, 'standalone generic QR');
assert.equal(decode(renderQr(genericQr, 1200, 900, 360), 4), genericQr, 'generic QR in a document image');
assert.equal(decode(renderQr(genericQr, 169, 179, 150), 5), genericQr, 'small 169x179 generic QR image');
assert.equal(decode(renderQr(genericQr, 169, 179, 150, 2), 6), genericQr, 'small QR with two-module margin');
assert.equal(decode(renderQr(denseQr, 189, 189, 180, 2), 7), denseQr, 'dense 189x189 QR image');

console.log('QR upload verification passed: receipt and generic QR images decoded.');

const fixtureIndex = process.argv.indexOf('--camera-fixture');
if (fixtureIndex !== -1) {
  const width = 640;
  const height = 480;
  const image = renderQr(genericQr, width, height, 360);
  const luminance = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < luminance.length; pixel++) {
    luminance[pixel] = image.data[pixel * 4];
  }
  const chroma = Buffer.alloc((width * height) / 4, 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luminance, chroma, chroma]);
  const video = [Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`)];
  for (let index = 0; index < 50; index++) video.push(frame);
  const path = process.argv[fixtureIndex + 1];
  assert(path, '--camera-fixture requires an output path');
  writeFileSync(path, Buffer.concat(video));
  console.log(`Camera fixture written to ${path}.`);
}
