import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createNumericCode, hashToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase";

const SESSION_REVALIDATE_MS = 60 * 1000;

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "supabase",
      name: "Supabase",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          const accessToken = String(credentials?.accessToken || "").trim();
          if (!accessToken) throw new Error("Invalid credentials");

          await connectDB();

          const { data: supaData, error: supaErr } =
            await supabaseAdmin.auth.getUser(accessToken);

          if (supaErr || !supaData?.user?.email) {
            throw new Error("Invalid credentials");
          }

          const supaUser = supaData.user;
          const normalizedEmail = supaUser.email.toLowerCase().trim();

          let user = await User.findOne({ email: normalizedEmail }).select(
            "name role isActive isEmailVerified twoFactorEnabled verificationStatus businessName sessionVersion suspendedAt suspendedUntil supabaseId needsPasswordSetup",
          );

          if (!user) {
            user = await User.create({
              name: supaUser.user_metadata?.name || "New User",
              email: normalizedEmail,
              supabaseId: supaUser.id,
              role: "customer",
              isActive: true,
              verificationStatus: "verified",
              isEmailVerified: true,
              emailVerifiedAt: new Date(),
              lastLogin: new Date(),
              needsPasswordSetup: true,
            });
          } else {
            if (!user.isActive) throw new Error("Account is deactivated");
            if (user.isCurrentlySuspended && user.isCurrentlySuspended()) {
              throw new Error("Your account is suspended");
            }

            if (user.supabaseId !== supaUser.id) {
              user.supabaseId = supaUser.id;
            }
            if (!user.isEmailVerified) {
              user.isEmailVerified = true;
              user.emailVerifiedAt = new Date();
            }
            user.lastLogin = new Date();
            await user.save();
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            verificationStatus: user.verificationStatus,
            businessName: user.businessName,
            sessionVersion: user.sessionVersion ?? 0,
            needsPasswordSetup: user.needsPasswordSetup,
          };
        } catch (error) {
          console.error("Supabase auth error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
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

          const normalizedEmail = credentials.email.toLowerCase().trim();

          // Authenticate against Supabase instead of MongoDB
          const { data: signInData, error: signInError } =
            await supabaseAdmin.auth.signInWithPassword({
              email: normalizedEmail,
              password: credentials.password,
            });

          if (signInError) {
            // Map Supabase errors to user-friendly messages
            if (signInError.message?.includes("Email not confirmed")) {
              throw new Error("EMAIL_NOT_VERIFIED");
            }
            throw new Error("Invalid credentials");
          }

          // Fetch the MongoDB profile for this user
          const user = await User.findOne({ email: normalizedEmail }).select(
            "name role isActive isEmailVerified twoFactorEnabled verificationStatus businessName sessionVersion suspendedAt suspendedUntil supabaseId",
          );

          if (!user) throw new Error("Invalid credentials");
          if (!user.isActive) throw new Error("Account is deactivated");

          // Sync email verification status from Supabase
          if (signInData.user?.email_confirmed_at && !user.isEmailVerified) {
            user.isEmailVerified = true;
            user.emailVerifiedAt = new Date(signInData.user.email_confirmed_at);
            await user.save();
          }

          if (!user.isEmailVerified) throw new Error("EMAIL_NOT_VERIFIED");

          // 2FA handling
          if (user.twoFactorEnabled) {
            const code = credentials.twoFactorCode;
            if (!code || code === "undefined" || code.trim() === "") {
              // Trigger Supabase OTP instead of Nodemailer
              const { error: otpErr } = await supabaseAdmin.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                  shouldCreateUser: false,
                  emailRedirectTo:
                    process.env.NEXTAUTH_URL || "http://localhost:3000",
                },
              });

              if (otpErr) {
                console.error("Supabase 2FA send error:", otpErr);
                throw new Error("Failed to send 2FA code");
              }

              throw new Error("TWO_FACTOR_REQUIRED");
            }

            // Verify the 2FA code via Supabase
            const { error: verifyErr } = await supabaseAdmin.auth.verifyOtp({
              email: normalizedEmail,
              token: credentials.twoFactorCode.trim(),
              type: "email",
            });

            if (verifyErr) {
              console.error("Supabase 2FA verify error:", verifyErr);
              throw new Error("INVALID_TWO_FACTOR_CODE");
            }
          }

          if (user.isCurrentlySuspended && user.isCurrentlySuspended()) {
            throw new Error("Your account is suspended");
          }

          user.lastLogin = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
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
      if (
        !account ||
        account.provider === "credentials" ||
        account.provider === "supabase"
      ) {
        return true;
      }

      try {
        await connectDB();

        const email = user?.email?.toLowerCase().trim();
        if (!email) return false;

        let dbUser = await User.findOne({ email });

        if (!dbUser) {
          // New OAuth user — create a Supabase auth account + MongoDB profile
          const randomPassword = require("crypto")
            .randomBytes(32)
            .toString("hex");
          const { data: supaUser, error: supaErr } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password: randomPassword,
              email_confirm: true, // OAuth emails are pre-verified
              user_metadata: {
                name: user.name || "New User",
                role: "customer",
              },
            });

          if (supaErr) {
            console.error("Supabase OAuth user creation failed:", supaErr);
            return false;
          }

          dbUser = await User.create({
            name: user.name || "New User",
            email,
            supabaseId: supaUser.user.id,
            role: "customer",
            isActive: true,
            verificationStatus: "verified",
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            lastLogin: new Date(),
            needsPasswordSetup: true,
          });
        } else {
          // Existing user — ensure supabaseId is linked
          if (!dbUser.supabaseId) {
            // Try to find or create a Supabase user for this existing account
            const { data: existingSupaUser } =
              await supabaseAdmin.auth.admin.listUsers();
            const match = existingSupaUser?.users?.find(
              (u) => u.email === email,
            );

            if (match) {
              dbUser.supabaseId = match.id;
            } else {
              const randomPassword = require("crypto")
                .randomBytes(32)
                .toString("hex");
              const { data: newSupaUser, error: createErr } =
                await supabaseAdmin.auth.admin.createUser({
                  email,
                  password: randomPassword,
                  email_confirm: true,
                });
              if (!createErr && newSupaUser?.user) {
                dbUser.supabaseId = newSupaUser.user.id;
              }
            }
          }

          if (!dbUser.isEmailVerified) {
            dbUser.isEmailVerified = true;
            dbUser.emailVerifiedAt = new Date();
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
        user.needsPasswordSetup = dbUser.needsPasswordSetup;

        return true;
      } catch (error) {
        console.error("Social sign-in error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        if (!user.role && user.email) {
          await connectDB();
          const dbUser = await User.findOne({
            email: user.email.toLowerCase().trim(),
          }).select(
            "_id role verificationStatus businessName sessionVersion isEmailVerified twoFactorEnabled needsPasswordSetup",
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
            token.needsPasswordSetup = dbUser.needsPasswordSetup;
            token.sessionInvalid = false;
            token.lastValidatedAt = Date.now();
            return token;
          }
        }
        token.id = user.id;
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.needsPasswordSetup = user.needsPasswordSetup;
        token.verificationStatus = user.verificationStatus;
        token.businessName = user.businessName;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.sessionInvalid = false;
        token.lastValidatedAt = Date.now();
        return token;
      }

      if (!token?.id) return token;
      const shouldRevalidate =
        trigger === "update" ||
        !token.lastValidatedAt ||
        Date.now() - token.lastValidatedAt > SESSION_REVALIDATE_MS;
      if (!shouldRevalidate) return token;
      try {
        await connectDB();
        const dbUser = await User.findById(token.id).select(
          "_id role verificationStatus businessName isActive suspendedAt suspendedUntil sessionVersion isEmailVerified twoFactorEnabled needsPasswordSetup",
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
          token.needsPasswordSetup = dbUser.needsPasswordSetup;
          token.verificationStatus = dbUser.verificationStatus;
          token.businessName = dbUser.businessName;
          token.sessionVersion = dbUser.sessionVersion ?? 0;
          token.sessionInvalid = false;
          delete token.sessionInvalidReason;
        }
      } catch (error) {
        console.error("Session revalidation error:", error);
      }
      token.lastValidatedAt = Date.now();
      return token;
    },

    async session({ session, token }) {
      if (!session.user) session.user = {};

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
      session.user.twoFactorEnabled = token.twoFactorEnabled;
      session.user.needsPasswordSetup = token.needsPasswordSetup;
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
    maxAge: 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
