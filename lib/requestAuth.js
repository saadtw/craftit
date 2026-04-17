import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { buildAuthUser, verifyAccessToken } from "@/lib/mobileAuth";

function getBearerToken(request) {
  const authHeader = request?.headers?.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function resolveBearerSession(request) {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = payload?.sub;

    if (!userId) {
      return { error: "SESSION_INVALID", errorReason: "missing_subject" };
    }

    await connectDB();
    const user = await User.findById(userId).select(
      "_id email name role verificationStatus businessName isEmailVerified twoFactorEnabled isActive suspendedAt suspendedUntil sessionVersion",
    );

    if (!user) {
      return { error: "SESSION_INVALID", errorReason: "user_not_found" };
    }

    if (!user.isActive) {
      return { error: "SESSION_INVALID", errorReason: "deactivated" };
    }

    const isSuspended =
      user.isCurrentlySuspended && user.isCurrentlySuspended();
    if (isSuspended) {
      return { error: "SESSION_INVALID", errorReason: "suspended" };
    }

    const tokenVersion = Number(payload?.sv ?? 0);
    const userVersion = Number(user.sessionVersion ?? 0);
    if (tokenVersion !== userVersion) {
      return { error: "SESSION_INVALID", errorReason: "version_mismatch" };
    }

    return {
      user: buildAuthUser(user),
      source: "mobile_bearer",
    };
  } catch {
    return { error: "SESSION_INVALID", errorReason: "invalid_bearer" };
  }
}

export async function resolveRequestSession(request) {
  const bearerToken = getBearerToken(request);
  const bearerSession = await resolveBearerSession(request);
  if (bearerSession?.user) {
    return bearerSession;
  }

  const session = await getServerSession(authOptions);
  if (session) {
    if (session.error === "SESSION_INVALID") {
      return session;
    }

    return {
      ...session,
      source: "nextauth_cookie",
    };
  }

  // Invalid bearer tokens should be treated as unauthenticated so routes
  // that only check `!session` return 401 instead of falling through to 403.
  if (bearerToken) {
    return null;
  }

  return null;
}
