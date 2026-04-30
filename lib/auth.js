import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createNumericCode, createRawToken, hashToken } from "@/lib/token";
import { sendTwoFactorCodeEmail } from "@/lib/email";

const SESSION_REVALIDATE_MS = 60 * 1000;

export const authOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Two factor code", type: "text" },
      },
      async authorize(credentials) {
        try {
          await connectDB();

          if (!credentials?.email || !credentials?.password) {
            throw new Error("Invalid credentials");
          }

          // Find user with password field
          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
          }).select(
            "+password +twoFactorCodeToken +twoFactorCodeExpires name role oauthProviders authMethod isActive isEmailVerified twoFactorEnabled verificationStatus businessName sessionVersion suspendedAt suspendedUntil",
          );

          if (!user) {
            throw new Error("Invalid credentials");
          }

          // Check if account is OAuth-only
          if (
            user.authMethod === "oauth" ||
            (user.oauthProviders?.length > 0 && !user.password)
          ) {
            throw new Error(
              `OAUTH_ACCOUNT_ONLY:${user.oauthProviders?.[0]?.provider || "google"}`,
            );
          }

          // Check if account is active
          if (!user.isActive) {
            throw new Error("Account is deactivated");
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          // Allow login for unverified emails, but flag them for verification
          // Frontend will redirect to verification page if emailVerificationRequired is true
          const emailVerificationRequired = !user.isEmailVerified;

          if (user.twoFactorEnabled) {
            if (!credentials.twoFactorCode) {
              const code = createNumericCode(6);
              user.twoFactorCodeToken = hashToken(code);
              user.twoFactorCodeExpires = new Date(Date.now() + 1000 * 60 * 10);
              await user.save();

              await sendTwoFactorCodeEmail({
                to: user.email,
                name: user.name,
                code,
              });

              throw new Error("TWO_FACTOR_REQUIRED");
            }

            const hashedCode = hashToken(credentials.twoFactorCode.trim());
            const isCodeValid =
              user.twoFactorCodeToken === hashedCode &&
              user.twoFactorCodeExpires &&
              user.twoFactorCodeExpires > new Date();

            if (!isCodeValid) {
              throw new Error("INVALID_TWO_FACTOR_CODE");
            }

            user.twoFactorCodeToken = undefined;
            user.twoFactorCodeExpires = undefined;
          }

          // Check if suspended
          if (user.isCurrentlySuspended && user.isCurrentlySuspended()) {
            throw new Error("Your account is suspended");
          }

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            emailVerificationRequired,
            twoFactorEnabled: user.twoFactorEnabled,
            verificationStatus: user.verificationStatus,
            businessName: user.businessName,
            sessionVersion: user.sessionVersion ?? 0,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      try {
        await connectDB();

        const email = user?.email?.toLowerCase().trim();
        if (!email) {
          return false;
        }

        let dbUser = await User.findOne({ email });

        if (!dbUser) {
          // New OAuth user
          dbUser = await User.create({
            name: user.name || "New User",
            email,
            password: createRawToken(32),
            authMethod: "oauth",
            oauthProviders: [
              {
                provider: account.provider,
                providerId: account.providerAccountId,
                email,
              },
            ],
            role: "customer",
            isActive: true,
            verificationStatus: "verified",
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            lastLogin: new Date(),
          });
        } else {
          // Existing user
          let hasProvider = dbUser.oauthProviders?.some(
            (p) =>
              p.provider === account.provider &&
              p.providerId === account.providerAccountId,
          );

          if (!hasProvider) {
            // Link this OAuth provider to existing account
            if (!dbUser.oauthProviders) {
              dbUser.oauthProviders = [];
            }
            dbUser.oauthProviders.push({
              provider: account.provider,
              providerId: account.providerAccountId,
              email,
            });

            // If transitioning from credentials-only to mixed auth
            if (dbUser.authMethod === "credentials") {
              dbUser.authMethod = "oauth_credentials_mixed";
            }
          }

          // Update email verification status via OAuth
          // Note: OAuth providers verify emails on their end, so we trust it
          if (!dbUser.isEmailVerified) {
            dbUser.isEmailVerified = true;
            dbUser.emailVerifiedAt = new Date();
            dbUser.emailVerificationMethod = "oauth";
          }

          dbUser.lastLogin = new Date();
          await dbUser.save();
        }

        user.id = dbUser._id.toString();
        user.role = dbUser.role;
        user.verificationStatus = dbUser.verificationStatus;
        user.businessName = dbUser.businessName;
        user.sessionVersion = dbUser.sessionVersion ?? 0;
        user.isEmailVerified = dbUser.isEmailVerified;
        user.twoFactorEnabled = dbUser.twoFactorEnabled;

        return true;
      } catch (error) {
        console.error("Social sign-in error:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        if (!user.role && user.email) {
          await connectDB();
          const dbUser = await User.findOne({
            email: user.email.toLowerCase().trim(),
          }).select(
            "_id role verificationStatus businessName sessionVersion isEmailVerified twoFactorEnabled",
          );
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.verificationStatus = dbUser.verificationStatus;
            token.businessName = dbUser.businessName;
            token.sessionVersion = dbUser.sessionVersion ?? 0;
            token.isEmailVerified = dbUser.isEmailVerified;
            token.emailVerificationRequired = !dbUser.isEmailVerified;
            token.twoFactorEnabled = dbUser.twoFactorEnabled;
            token.sessionInvalid = false;
            token.lastValidatedAt = Date.now();
            return token;
          }
        }

        token.id = user.id;
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
        token.emailVerificationRequired = user.emailVerificationRequired;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.verificationStatus = user.verificationStatus;
        token.businessName = user.businessName;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.sessionInvalid = false;
        token.lastValidatedAt = Date.now();
        return token;
      }

      // No authenticated identity in token, nothing to validate.
      if (!token?.id) {
        return token;
      }

      const shouldRevalidate =
        !token.lastValidatedAt ||
        Date.now() - token.lastValidatedAt > SESSION_REVALIDATE_MS;

      if (!shouldRevalidate) {
        return token;
      }

      try {
        await connectDB();

        const dbUser = await User.findById(token.id).select(
          "_id role verificationStatus businessName isActive suspendedAt suspendedUntil sessionVersion isEmailVerified twoFactorEnabled",
        );

        const isSuspended =
          dbUser?.isCurrentlySuspended && dbUser.isCurrentlySuspended();
        const hasVersionMismatch =
          !!dbUser &&
          (dbUser.sessionVersion ?? 0) !== (token.sessionVersion ?? 0);

        if (!dbUser || !dbUser.isActive || isSuspended || hasVersionMismatch) {
          token.sessionInvalid = true;
          token.sessionInvalidReason = !dbUser
            ? "user_not_found"
            : !dbUser.isActive
              ? "deactivated"
              : isSuspended
                ? "suspended"
                : "version_mismatch";
          delete token.id;
          delete token.role;
          delete token.verificationStatus;
          delete token.businessName;
          delete token.sessionVersion;
        } else {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.isEmailVerified = dbUser.isEmailVerified;
          token.twoFactorEnabled = dbUser.twoFactorEnabled;
          token.verificationStatus = dbUser.verificationStatus;
          token.businessName = dbUser.businessName;
          token.sessionVersion = dbUser.sessionVersion ?? 0;
          token.sessionInvalid = false;
          delete token.sessionInvalidReason;
        }
      } catch (error) {
        // Keep the current token if validation fails transiently.
        console.error("Session revalidation error:", error);
      }

      token.lastValidatedAt = Date.now();
      return token;
    },

    async session({ session, token }) {
      if (!session.user) {
        session.user = {};
      }

      if (token.sessionInvalid) {
        session.error = "SESSION_INVALID";
        session.errorReason = token.sessionInvalidReason;
        session.user.id = undefined;
        session.user.role = undefined;
        session.user.verificationStatus = undefined;
        session.user.businessName = undefined;
        return session;
      }

      session.error = undefined;
      session.errorReason = undefined;

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.isEmailVerified = token.isEmailVerified;
      session.user.emailVerificationRequired = token.emailVerificationRequired;
      session.user.twoFactorEnabled = token.twoFactorEnabled;
      session.user.verificationStatus = token.verificationStatus;
      session.user.businessName = token.businessName;
      session.user.sessionVersion = token.sessionVersion;

      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
