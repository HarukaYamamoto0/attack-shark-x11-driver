import HID, { HIDAsync } from 'node-hid';
import { delay } from './src';

const dev = await HIDAsync.open(0x1d57, 0xfa60);

await dev.sendFeatureReport([0xa0, 0x05, 0xf, 0x00, 0x01, 0x00, 0x00, 0x00]);

await delay(600);

await dev.getFeatureReport(0xa0, 8); // status check

const data = await dev.getFeatureReport(0x05, 0xf);
console.log(data.toHex());

dev.close();
