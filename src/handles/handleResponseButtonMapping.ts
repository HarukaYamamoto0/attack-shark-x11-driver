import { type Option, PacketLength } from '../types';
import { ButtonMapping, ButtonMappingBuilder, SlotButton } from '../protocols/ButtonMappingBuilder';

export function handleResponseButtonMapping(buffer: Uint8Array): Option<ButtonMappingBuilder> {
	console.log('Raw: ' + buffer.toHex());

	if (buffer.length !== PacketLength.BUTTON_MAPPING)
		throw new Error(
			`Invalid button mapping buffer size; expected ${PacketLength.BUTTON_MAPPING} but received ${buffer.length}`,
		);

	const view = new DataView(buffer.buffer);
	const checksumByte = view.getUint16(57);

	let checksum = 0x00;
	for (let i = 3; i <= 56; i++) {
		checksum += view.getUint8(i);
	}

	if (checksum !== checksumByte)
		throw new Error(
			`Invalid button mapping response checksum; expected: ${checksumByte.toString(16).padStart(4, '0')}, ` +
				`but calculated: ${checksum.toString(16).padStart(4, '0')}`,
		);

	// const reportId = view.getUint8(0);
	// const packetLength = view.getUint8(1);
	const profileId = view.getUint8(2);

	const slot1 = new SlotButton(view.getUint8(3), view.getUint8(4), view.getUint8(5));
	const slot2 = new SlotButton(view.getUint8(6), view.getUint8(7), view.getUint8(8));
	const slot3 = new SlotButton(view.getUint8(9), view.getUint8(10), view.getUint8(11));
	const slot4 = new SlotButton(view.getUint8(12), view.getUint8(13), view.getUint8(14));

	const slot5 = new SlotButton(view.getUint8(15), view.getUint8(16), view.getUint8(17));
	const slot6 = new SlotButton(view.getUint8(24), view.getUint8(25), view.getUint8(26));
	const slot7 = new SlotButton(view.getUint8(21), view.getUint8(22), view.getUint8(23));
	const slot8 = new SlotButton(view.getUint8(18), view.getUint8(19), view.getUint8(20));

	const slot9 = new SlotButton(view.getUint8(27), view.getUint8(28), view.getUint8(29));
	const slot10 = new SlotButton(view.getUint8(30), view.getUint8(31), view.getUint8(32));
	const slot11 = new SlotButton(view.getUint8(33), view.getUint8(34), view.getUint8(35));
	const slot12 = new SlotButton(view.getUint8(36), view.getUint8(37), view.getUint8(38));

	const slot13 = new SlotButton(view.getUint8(39), view.getUint8(40), view.getUint8(41));
	const slot14 = new SlotButton(view.getUint8(42), view.getUint8(43), view.getUint8(44));
	const slot15 = new SlotButton(view.getUint8(45), view.getUint8(46), view.getUint8(47));

	const slot16 = new SlotButton(view.getUint8(48), view.getUint8(49), view.getUint8(50));
	const slot17 = new SlotButton(view.getUint8(54), view.getUint8(55), view.getUint8(56));
	const slot18 = new SlotButton(view.getUint8(51), view.getUint8(52), view.getUint8(53));

	return new ButtonMappingBuilder()
		.setProfileId(profileId)
		.setButton(ButtonMapping.Slot1, slot1)
		.setButton(ButtonMapping.Slot2, slot2)
		.setButton(ButtonMapping.Slot3, slot3)
		.setButton(ButtonMapping.Slot4, slot4)
		.setButton(ButtonMapping.Slot5, slot5)
		.setButton(ButtonMapping.Slot6, slot6)
		.setButton(ButtonMapping.Slot7, slot7)
		.setButton(ButtonMapping.Slot8, slot8)
		.setButton(ButtonMapping.Slot9, slot9)
		.setButton(ButtonMapping.Slot10, slot10)
		.setButton(ButtonMapping.Slot11, slot11)
		.setButton(ButtonMapping.Slot12, slot12)
		.setButton(ButtonMapping.Slot13, slot13)
		.setButton(ButtonMapping.Slot14, slot14)
		.setButton(ButtonMapping.Slot15, slot15)
		.setButton(ButtonMapping.Slot16, slot16)
		.setButton(ButtonMapping.Slot17, slot17)
		.setButton(ButtonMapping.Slot18, slot18)
		.calculateChecksum();
}
