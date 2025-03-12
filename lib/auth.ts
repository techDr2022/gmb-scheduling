import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import prisma from "./prisma"; // Import from singleton

// Define extended token type
interface ExtendedJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

// Define extended session type
interface ExtendedSession {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/business.manage",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Manual update to store refresh token
      if (account && account.refresh_token && user.email) {
        try {
          // Find or create user
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            // Update the existing user
            await prisma.user.update({
              where: { email: user.email },
              data: {
                refreshToken: account.refresh_token,
                name: user.name,
                image: user.image,
              },
            });
          } else {
            // Create a new user
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                image: user.image || "",
                refreshToken: account.refresh_token,
              },
            });
          }
        } catch (err) {
          console.error("Error storing refresh token:", err);
          // Don't prevent sign in if database update fails
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Return previous token if the access token has not expired yet
      const expiresAt = (token.expiresAt as number) || 0;
      if (expiresAt && Date.now() < expiresAt * 1000) {
        return token;
      }
      // Access token has expired, try to update it
      return refreshAccessToken(token as ExtendedJWT);
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession;
      const extendedToken = token as ExtendedJWT;

      extendedSession.accessToken = extendedToken.accessToken;
      extendedSession.refreshToken = extendedToken.refreshToken;
      extendedSession.error = extendedToken.error;

      return extendedSession;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken || "",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
    };
  } catch (err) {
    console.error("Error refreshing access token:", err);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
