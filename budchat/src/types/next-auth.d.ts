import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      /** Drives the "confirm your address" banner; see lib/email-verification.ts. */
      emailVerified: boolean;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone?: string;
    emailVerified?: boolean;
  }
}
