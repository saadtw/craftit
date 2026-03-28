import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const SESSION_REVALIDATE_MS = 60 * 1000;

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectDB();

          // Find user with password field
          const user = await User.findOne({ email: credentials.email }).select(
            "+password",
          );

          if (!user) {
            throw new Error("Invalid credentials");
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
          "_id role verificationStatus businessName isActive suspendedAt suspendedUntil sessionVersion",
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
