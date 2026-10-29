import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from './logger';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'aether-fallback-secret-development-only-change-in-prod',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('Invalid email or password format');
        }

        const { email, password } = parsed.data;

        // If database connection is configured
        if (db) {
          try {
            const userRecords = await db
              .select()
              .from(schema.users)
              .where(eq(schema.users.email, email.toLowerCase()))
              .limit(1);

            const user = userRecords[0];
            if (!user || !user.passwordHash) {
              throw new Error('No account found with this email.');
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
              throw new Error('Incorrect password.');
            }

            return {
              id: user.id,
              name: user.name || email.split('@')[0],
              email: user.email,
              image: user.image,
              role: user.role,
              theme: user.theme
            };
          } catch (err) {
            logger.error({ err }, 'Error during credential authorization');
            throw err;
          }
        }

        // Safe development mode without database setup
        return {
          id: 'dev-user-id',
          name: email.split('@')[0],
          email: email.toLowerCase(),
          role: 'user',
          theme: 'light'
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'user';
        token.theme = (user as { theme?: string }).theme || 'light';
      }
      if (trigger === 'update' && session?.theme) {
        token.theme = session.theme;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { theme?: string }).theme = token.theme as string;
      }
      return session;
    }
  }
};
