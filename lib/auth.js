import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

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
            "+password"
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
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          // Check manufacturer verification
          if (
            user.role === "manufacturer" &&
            user.verificationStatus !== "approved"
          ) {
            throw new Error("Your account is pending verification");
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
      }
      return token;
    },

    async session({ session, token }) {
      // Add user info to session
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.verificationStatus = token.verificationStatus;
        session.user.businessName = token.businessName;
      }
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
