import { MAX_PROFILES, type Profile } from '../../types.js';
import { ParamsError } from '../../errors';

export function handleProfileChanged(params1: number, _params2: number): Profile {
	// params1 is 0-based (0x00-0x04 for profiles 1-5)
	if (params1 >= MAX_PROFILES) throw new ParamsError('params1', `Invalid profile byte: ${params1}`);

	return (params1 + 1) as Profile;
}
