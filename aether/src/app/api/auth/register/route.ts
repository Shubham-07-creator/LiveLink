import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit/limiter';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100)
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(`register:${ip}`, 10, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    if (db) {
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, cleanEmail))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const [newUser] = await db
        .insert(schema.users)
        .values({
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          theme: 'light',
          role: 'user'
        })
        .returning({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          theme: schema.users.theme
        });

      logger.info({ userId: newUser.id }, 'New user account registered');
      return NextResponse.json({ success: true, user: newUser }, { status: 201 });
    }

    // Dev mode fallback
    return NextResponse.json({
      success: true,
      user: { id: 'dev-user-id', name, email: cleanEmail, theme: 'light' }
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Registration error');
    return NextResponse.json({ error: 'Unable to complete registration. Please try again later.' }, { status: 500 });
  }
}
