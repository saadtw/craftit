import crypto from "crypto";

export function createRawToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function createNumericCode(length = 6) {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max).toString().padStart(length, "0");
  return code;
}
