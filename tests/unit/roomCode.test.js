import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  isValidRoomCode,
  isPrivateRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_REGEX,
  STANDARD_ROOM_CODE_REGEX,
  PRIVATE_ROOM_CODE_REGEX
} from '../../frontend/src/utils/roomCode.js';

describe('Layer 1: Room Code Generator & Validator', () => {
  it('generates standard room codes matching xxxx-xxxx-xxxx format', () => {
    const code = generateRoomCode(false);
    expect(code).toMatch(STANDARD_ROOM_CODE_REGEX);
    expect(isValidRoomCode(code)).toBe(true);
    expect(isPrivateRoomCode(code)).toBe(false);
  });

  it('generates private 1-on-1 room codes matching p-xxxx-xxxx-xxxx format', () => {
    const code = generateRoomCode(true);
    expect(code).toMatch(PRIVATE_ROOM_CODE_REGEX);
    expect(isValidRoomCode(code)).toBe(true);
    expect(isPrivateRoomCode(code)).toBe(true);
    expect(code.startsWith('p-')).toBe(true);
  });

  it('excludes ambiguous characters (0, O, o, 1, l, I) from generated alphabet', () => {
    const forbidden = ['0', 'O', 'o', '1', 'l', 'I'];
    for (const char of forbidden) {
      expect(ROOM_CODE_ALPHABET.includes(char)).toBe(false);
    }

    // Verify 1,000 generated codes strictly contain only unambiguous characters
    for (let i = 0; i < 1000; i++) {
      const code = generateRoomCode(false);
      const cleanParts = code.split('-');
      expect(cleanParts.length).toBe(3);
      for (const part of cleanParts) {
        expect(part.length).toBe(4);
        for (const char of part) {
          expect(ROOM_CODE_ALPHABET.includes(char)).toBe(true);
          expect(forbidden.includes(char)).toBe(false);
        }
      }
    }
  });

  it('correctly validates valid room codes and rejects invalid formats', () => {
    // Valid cases
    expect(isValidRoomCode('2345-6789-abcd')).toBe(true);
    expect(isValidRoomCode('p-2345-6789-abcd')).toBe(true);
    expect(isValidRoomCode('https://livelink.app/2345-6789-abcd')).toBe(true);
    expect(isValidRoomCode('https://livelink.app/p-2345-6789-abcd')).toBe(true);
    expect(isValidRoomCode('  2345-6789-abcd  ')).toBe(true);

    // Invalid cases: forbidden characters
    expect(isValidRoomCode('0000-1111-2222')).toBe(false); // contains 0 and 1
    expect(isValidRoomCode('oooo-llll-IIII')).toBe(false); // contains o, l, I
    expect(isValidRoomCode('test-room-1234')).toBe(false); // invalid pattern
    expect(isValidRoomCode('abc-def-ghi')).toBe(false); // 3-char chunks
    expect(isValidRoomCode('2345-6789-abcd-efgh')).toBe(false); // 4 chunks
    expect(isValidRoomCode('23456789abcd')).toBe(false); // no hyphens
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode(null)).toBe(false);
    expect(isValidRoomCode(undefined)).toBe(false);
    expect(isValidRoomCode(12345)).toBe(false);
  });

  it('guarantees uniqueness over 100,000 generated codes with zero collisions', () => {
    const generatedSet = new Set();
    const ITERATIONS = 100000;

    for (let i = 0; i < ITERATIONS; i++) {
      const code = generateRoomCode(false);
      generatedSet.add(code);
    }

    expect(generatedSet.size).toBe(ITERATIONS);
  });
});
