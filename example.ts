import { ConnectionMode, DpiBuilder } from './src/index.js';

const dpi = new DpiBuilder();

console.log(dpi.build(ConnectionMode.Wired).toHex());
