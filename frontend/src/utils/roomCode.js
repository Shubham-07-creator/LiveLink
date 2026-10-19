import { customAlphabet } from 'nanoid';

// Unambiguous lowercase alphabet excluding confusing characters (0, O, o, 1, l, I)
const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
const generateChunk = customAlphabet(alphabet, 4);

/**
 * Generates secure, collision-resistant room codes formatted as:
 * xxxx-xxxx-xxxx (e.g., "kx9m-p2qr-7vtz")
 */
export const generateRoomCode = () => {
    return `${generateChunk()}-${generateChunk()}-${generateChunk()}`;
};

export default generateRoomCode;
