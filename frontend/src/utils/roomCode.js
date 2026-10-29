import { customAlphabet } from 'nanoid';

// Step 4: Unambiguous lowercase alphabet excluding confusing characters (0, O, o, 1, l, I)
export const ROOM_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const generateChunk = customAlphabet(ROOM_CODE_ALPHABET, 4);

// Standard: xxxx-xxxx-xxxx | Private: p-xxxx-xxxx-xxxx
export const ROOM_CODE_REGEX = /^(p-)?[2-9a-km-z]{4}-[2-9a-km-z]{4}-[2-9a-km-z]{4}$/i;
export const STANDARD_ROOM_CODE_REGEX = /^[2-9a-km-z]{4}-[2-9a-km-z]{4}-[2-9a-km-z]{4}$/i;
export const PRIVATE_ROOM_CODE_REGEX = /^p-[2-9a-km-z]{4}-[2-9a-km-z]{4}-[2-9a-km-z]{4}$/i;

/**
 * Validates whether a given room code strictly follows the required format:
 * xxxx-xxxx-xxxx (standard) or p-xxxx-xxxx-xxxx (private)
 */
export const isValidRoomCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim().toLowerCase().replace(/^https?:\/\/[^/]+\//, '');
    return ROOM_CODE_REGEX.test(clean);
};

export const isPrivateRoomCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    const clean = code.trim().toLowerCase().replace(/^https?:\/\/[^/]+\//, '');
    return PRIVATE_ROOM_CODE_REGEX.test(clean);
};

/**
 * Generates secure, collision-resistant room codes formatted as:
 * xxxx-xxxx-xxxx (e.g., "kx9m-p2qr-7vtz") or p-xxxx-xxxx-xxxx for Private 1-on-1 Calls.
 */
export const generateRoomCode = (isPrivate = false) => {
    const code = `${generateChunk()}-${generateChunk()}-${generateChunk()}`.toLowerCase();
    return isPrivate ? `p-${code}` : code;
};

export default generateRoomCode;
