import { MAX_PROFILES, type Profile } from '../../types.js';
import { ParamsError } from '../../errors';

export function handleProfileChanged(params1: number, _params2: number): Profile {
	if (params1 > MAX_PROFILES) throw new ParamsError('params1', `Invalid profile byte: ${params1}`);

	return (params1 + 1) as Profile;
}
