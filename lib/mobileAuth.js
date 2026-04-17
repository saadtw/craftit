import jwt from "jsonwebtoken";
import { createRawToken, hashToken } from "@/lib/token";

const ACCESS_TOKEN_ISSUER = "craftit";
const ACCESS_TOKEN_AUDIENCE = "craftit-mobile";
const ACCESS_TOKEN_EXPIRY = process.env.MOBILE_ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(
  process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS || 30,
);

function getJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing MOBILE_JWT_SECRET or NEXTAUTH_SECRET");
  }
  return secret;
}

export function buildAuthUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    verificationStatus: user.verificationStatus,
    businessName: user.businessName,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    sessionVersion: user.sessionVersion ?? 0,
  };
}

export function createAccessToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    sv: user.sessionVersion ?? 0,
    typ: "mobile_access",
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
    notBefore: 0,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: ACCESS_TOKEN_ISSUER,
    audience: ACCESS_TOKEN_AUDIENCE,
  });
}

export function createRefreshTokenPayload() {
  const refreshToken = createRawToken(48);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  return {
    refreshToken,
    tokenHash,
    expiresAt,
  };
}

export function appendRefreshToken(
  user,
  tokenHash,
  expiresAt,
  deviceMeta = {},
) {
  const refreshTokenDoc = {
    tokenHash,
    expiresAt,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    deviceId: deviceMeta.deviceId || undefined,
    deviceName: deviceMeta.deviceName || undefined,
  };

  user.mobileRefreshTokens = (user.mobileRefreshTokens || []).filter(
    (token) => {
      if (token.revokedAt) return false;
      return token.expiresAt > new Date();
    },
  );

  user.mobileRefreshTokens.push(refreshTokenDoc);

  // Keep the most recent device sessions only.
  if (user.mobileRefreshTokens.length > 20) {
    user.mobileRefreshTokens = user.mobileRefreshTokens
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  }

  return refreshTokenDoc;
}

export function findRefreshToken(user, rawRefreshToken) {
  const tokenHash = hashToken(rawRefreshToken);
  const token = (user.mobileRefreshTokens || []).find(
    (entry) =>
      entry.tokenHash === tokenHash &&
      !entry.revokedAt &&
      entry.expiresAt > new Date(),
  );

  return {
    tokenHash,
    token,
  };
}

export function revokeRefreshToken(user, tokenHash) {
  let revoked = false;
  user.mobileRefreshTokens = (user.mobileRefreshTokens || []).map((entry) => {
    if (entry.tokenHash !== tokenHash || entry.revokedAt) {
      return entry;
    }
    revoked = true;
    return {
      ...(entry.toObject ? entry.toObject() : entry),
      revokedAt: new Date(),
    };
  });
  return revoked;
}

export function getAccessTokenExpirySeconds() {
  // Keep this explicit for mobile clients; aligns with default 15m unless env overrides.
  if (ACCESS_TOKEN_EXPIRY === "15m") return 15 * 60;
  if (ACCESS_TOKEN_EXPIRY === "30m") return 30 * 60;
  if (ACCESS_TOKEN_EXPIRY === "1h") return 60 * 60;
  return 15 * 60;
}
