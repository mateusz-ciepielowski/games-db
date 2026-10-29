import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/zodSchemas";
import { rateLimit } from "@/lib/rate-limit";

export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
// Valid bcrypt hash keeps the missing-account path computationally comparable.
const dummyHash =
  "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx3Jq9EEXh4BJX6VXY1c.V/xrUi";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;
        if (!(await rateLimit("login", identifier))) return null;
        const user = await prisma.user.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
        });
        const matches = await bcrypt.compare(
          password,
          user?.password ?? dummyHash,
        );
        if (!user?.password || !matches) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const id = user?.id ?? token.sub;
      if (!id) return null;
      const current = await prisma.user.findUnique({
        where: { id },
        select: { sessionVersion: true, name: true, email: true, image: true },
      });
      if (
        !current ||
        (!user && token.sessionVersion !== current.sessionVersion)
      )
        return null;
      token.sub = id;
      token.sessionVersion = current.sessionVersion;
      token.name = current.name;
      token.email = current.email;
      token.picture = current.image;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
