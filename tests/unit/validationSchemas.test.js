import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
  addToHistorySchema,
  scheduleMeetingSchema,
  feedbackSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../../backend/src/middleware/validator.js';

describe('Backend Zod Input Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid user registration payload', () => {
      const valid = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123!',
        avatar: 'https://images.unsplash.com/photo-avatar.jpg'
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects short passwords (< 6 chars)', () => {
      const invalid = {
        name: 'John',
        email: 'john@example.com',
        password: '123'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('at least 6 characters');
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain..com'];
      for (const email of invalidEmails) {
        const result = registerSchema.safeParse({
          name: 'Jane',
          email,
          password: 'password123'
        });
        expect(result.success).toBe(false);
      }
    });

    it('rejects non-https avatar URLs (e.g. http:// or javascript:)', () => {
      const httpAvatar = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        avatar: 'http://insecure.com/pic.jpg'
      };
      expect(registerSchema.safeParse(httpAvatar).success).toBe(false);

      const jsAvatar = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        avatar: 'javascript:alert(1)'
      };
      expect(registerSchema.safeParse(jsAvatar).success).toBe(false);
    });

    it('handles unicode names and trims properly', () => {
      const unicodeUser = {
        name: '  José María Müller  ',
        email: 'jose@example.com',
        password: 'strongPassword!'
      };
      const result = registerSchema.safeParse(unicodeUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('José María Müller');
      }
    });

    it('rejects excessively long payload fields (DoS prevention)', () => {
      const hugeName = 'A'.repeat(150);
      const result = registerSchema.safeParse({
        name: hugeName,
        email: 'valid@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts login with email and password', () => {
      const payload = { email: 'user@example.com', password: 'password123' };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts login with username and password', () => {
      const payload = { username: 'validUser_99', password: 'password123' };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects login when neither username nor email is provided', () => {
      const payload = { password: 'password123' };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const payload = { email: 'user@example.com', password: '' };
      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('googleAuthSchema', () => {
    it('accepts valid credential tokens', () => {
      const payload = { credential: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEy...' };
      const result = googleAuthSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects empty or short credential strings', () => {
      expect(googleAuthSchema.safeParse({ credential: '' }).success).toBe(false);
      expect(googleAuthSchema.safeParse({ credential: 'short' }).success).toBe(false);
    });
  });

  describe('addToHistorySchema', () => {
    it('accepts valid history record', () => {
      const payload = {
        meeting_code: 'abcd-efgh-ijkl',
        duration: 1845,
        participantCount: 3
      };
      const result = addToHistorySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects negative duration or zero participant count', () => {
      expect(addToHistorySchema.safeParse({ meeting_code: 'abc', duration: -10 }).success).toBe(false);
      expect(addToHistorySchema.safeParse({ meeting_code: 'abc', participantCount: 0 }).success).toBe(false);
    });
  });

  describe('scheduleMeetingSchema & feedbackSchema', () => {
    it('validates schedule meeting correctly', () => {
      const valid = {
        title: 'Sprint Planning',
        meetingCode: 'plan-room-2026',
        startTime: '2026-11-01T10:00:00Z',
        durationMinutes: 45
      };
      expect(scheduleMeetingSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        title: 'A', // too short (< 2)
        meetingCode: 'room-1'
      };
      expect(scheduleMeetingSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates feedback rating range 1 to 5', () => {
      expect(feedbackSchema.safeParse({ meetingCode: 'room-1', rating: 5, feedback: 'Great!' }).success).toBe(true);
      expect(feedbackSchema.safeParse({ meetingCode: 'room-1', rating: 0 }).success).toBe(false);
      expect(feedbackSchema.safeParse({ meetingCode: 'room-1', rating: 6 }).success).toBe(false);
    });
  });
});
