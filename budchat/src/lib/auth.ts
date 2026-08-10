import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Throttle by IP and by account so neither a single host nor a single
        // targeted mailbox can be brute-forced. NextAuth hands us a bare
        // request-like object here, so the headers are read defensively.
        const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
        const ip = (headers["x-forwarded-for"] ?? headers["x-real-ip"] ?? "unknown")
          .split(",")[0]
          .trim();

        if (!rateLimit(`login-ip:${ip}`, 20, 15 * 60).ok) return null;
        if (!rateLimit(`login-email:${email}`, 10, 15 * 60).ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).phone = token.phone as string | undefined;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
