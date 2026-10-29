import { describe, it, expect } from 'vitest';

describe('Chat Sanitization & Attachment Limits', () => {
  // Logic mirror of backend/src/controllers/socketManager.js chat-message handler
  const sanitizeChatMessage = (data) => {
    if (typeof data !== 'string' || !data.trim()) return null;

    if (data.startsWith('data:image/')) {
      const imageMimeRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
      if (data.length > 2.8 * 1024 * 1024 || !imageMimeRegex.test(data)) {
        return { error: 'Image must be PNG, JPEG, WEBP, or GIF and under 2MB.' };
      }
      return { safeData: data };
    }

    const safeData = data.replace(/<\/?[^>]+(>|$)/g, '').trim().slice(0, 2000);
    if (!safeData) return null;
    return { safeData };
  };

  const sanitizeSender = (sender, defaultName = 'User') => {
    if (typeof sender !== 'string') return defaultName;
    const cleaned = sender.replace(/<\/?[^>]+(>|$)/g, '').trim().slice(0, 50);
    return cleaned || defaultName;
  };

  describe('Text Message Sanitization', () => {
    it('strips <script> and HTML tags from text messages', () => {
      const xss1 = '<script>alert("xss")</script>Hello!';
      // Strips <script> and </script> tags, preventing HTML tag injection into DOM
      expect(sanitizeChatMessage(xss1)?.safeData).toBe('alert("xss")Hello!');

      const xss2 = '<img src=x onerror="alert(1)">Check this out';
      expect(sanitizeChatMessage(xss2)?.safeData).toBe('Check this out');

      const bold = '<b>Important</b> Announcement';
      expect(sanitizeChatMessage(bold)?.safeData).toBe('Important Announcement');
    });

    it('rejects empty or whitespace-only messages', () => {
      expect(sanitizeChatMessage('')).toBeNull();
      expect(sanitizeChatMessage('    \n\t  ')).toBeNull();
      expect(sanitizeChatMessage(123)).toBeNull();
      expect(sanitizeChatMessage(null)).toBeNull();
    });

    it('clamps messages exceeding 2000 characters', () => {
      const longMessage = 'A'.repeat(2500);
      const res = sanitizeChatMessage(longMessage);
      expect(res?.safeData?.length).toBe(2000);
    });

    it('sanitizes sender display names by stripping HTML tags', () => {
      const maliciousSender = '<script>evil()</script>Alice';
      expect(sanitizeSender(maliciousSender)).toBe('evil()Alice');

      const longSender = 'SuperLongName'.repeat(10);
      expect(sanitizeSender(longSender).length).toBe(50);

      expect(sanitizeSender('', 'Fallback')).toBe('Fallback');
      expect(sanitizeSender(null, 'Fallback')).toBe('Fallback');
    });
  });

  describe('Image Attachment Validation & Size Limits', () => {
    it('accepts valid base64 PNG, JPEG, WEBP, and GIF images within 2MB limit', () => {
      const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const validJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const validWebp = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      const validGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      expect(sanitizeChatMessage(validPng)?.safeData).toBe(validPng);
      expect(sanitizeChatMessage(validJpeg)?.safeData).toBe(validJpeg);
      expect(sanitizeChatMessage(validWebp)?.safeData).toBe(validWebp);
      expect(sanitizeChatMessage(validGif)?.safeData).toBe(validGif);
    });

    it('rejects SVG images due to XSS risk', () => {
      const svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=';
      const result = sanitizeChatMessage(svg);
      expect(result?.error).toContain('Image must be PNG, JPEG, WEBP, or GIF');
    });

    it('rejects image payloads exceeding 2MB binary size (2.8MB base64 encoded)', () => {
      const oversizedPayload = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);
      const result = sanitizeChatMessage(oversizedPayload);
      expect(result?.error).toContain('under 2MB');
    });

    it('rejects malformed base64 image strings', () => {
      const malformed = 'data:image/png;base64,InvalidCharacters!@#$%^&*()';
      const result = sanitizeChatMessage(malformed);
      expect(result?.error).toContain('Image must be PNG, JPEG, WEBP, or GIF');
    });
  });

  describe('Avatar URL Security', () => {
    const isSafeAvatarUrl = (url) => {
      if (!url) return true;
      if (typeof url !== 'string') return false;
      const httpsRegex = /^https:\/\/[^\s$.?#].[^\s]*$/i;
      return httpsRegex.test(url);
    };

    it('allows valid HTTPS URLs for avatars', () => {
      expect(isSafeAvatarUrl('https://example.com/avatar.png')).toBe(true);
      expect(isSafeAvatarUrl('https://lh3.googleusercontent.com/a/ACg8ocL...')).toBe(true);
      expect(isSafeAvatarUrl('')).toBe(true);
      expect(isSafeAvatarUrl(undefined)).toBe(true);
    });

    it('rejects unsafe schemes: javascript, http, data, ftp, file', () => {
      expect(isSafeAvatarUrl('http://insecure.com/avatar.jpg')).toBe(false);
      expect(isSafeAvatarUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeAvatarUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeAvatarUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeAvatarUrl('ftp://example.com/file')).toBe(false);
    });
  });
});
