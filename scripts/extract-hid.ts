/**
 * Extracts `usb.capdata` fields from a USBPcap JSON export and writes them
 * as plain text, one packet per line.
 *
 * This is useful for HID reverse engineering, allowing captured reports to be
 * inspected, diffed, or processed by other scripts without navigating the
 * original Wireshark/USBPcap JSON structure.
 *
 * Usage:
 * ```bash
 * bun run extract-hid.ts capture.json
 * bun run extract-hid.ts capture.json output.txt
 * ```
 *
 * Input:
 * - First argument: path to the USBPcap JSON file.
 * - Second argument (optional): output file path.
 *
 * Output example:
 * ```txt
 * 03 55 40 01 5f
 * 05 0f 01 00 03 a8 00 ff
 * ```
 */

import { readFileSync, writeFileSync } from 'node:fs';

const inputFile = process.argv[2] ?? 'raw.json';
const outputFile = process.argv[3] ?? 'hid.txt';

const raw = readFileSync(inputFile, 'utf8');
const data = JSON.parse(raw);

const packets = Array.isArray(data) ? data : [data];

const lines = packets
	.map((packet) => packet?._source?.layers?.['usb.capdata'])
	.filter(Boolean)
	.map((capData: string) => capData.replaceAll(':', ' '));

writeFileSync(outputFile, lines.join('\n'));

console.log(`Extracted ${lines.length} packets to ${outputFile}`);
