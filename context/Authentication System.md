# CraftIT Authentication System - Complete Documentation

## Overview

CraftIT uses NextAuth.js v4 with a hybrid authentication system supporting:

- ✅ **Credentials-based** (Email + Password)
- ✅ **OAuth** (Google only)
- ✅ **Two-Factor Authentication** (Email-based 2FA)
- ✅ **Session Management** (JWT with periodic revalidation)

---

## Authentication Architecture

### Tech Stack

- **Framework**: Next.js 16 with Next-Auth 4.24.13
- **Database**: MongoDB with Mongoose
- **Password Hashing**: bcryptjs
- **Session**: JWT-based, 7-day max age
- **Email Provider**: Resend for verification & 2FA codes

### Key Configuration Files

- `lib/auth.js` - NextAuth configuration & OAuth/Credentials providers
- `models/User.js` - User schema with auth fields
- `app/SessionProvider.js` - NextAuth session wrapper
- `lib/token.js` - Token generation utilities
- `lib/email.js` - Email sending service

---

## User Model - Auth Fields

### Authentication Fields

```javascript
// Auth method tracking
authMethod: "credentials" | "oauth" | "oauth_credentials_mixed"; // default: "credentials"
oauthProviders: [
  {
    // OAuth provider tracking
    provider: "google", // enum: ["google"]
    providerId: String, // unique provider ID
    email: String, // provider's email
    linkedAt: Date, // when linked
  },
];
password: String; // required, selected: false
```

### Email Verification Fields

```javascript
isEmailVerified: Boolean,                          // default: false
emailVerifiedAt: Date,                             // when verified
emailVerificationMethod: "manual" | "oauth",      // how it was verified
emailVerificationToken: String,                    // verification token (select: false)
emailVerificationExpires: Date                     // token expiry (select: false)
```

### Account Status Fields

```javascript
isActive: Boolean,                    // default: true
sessionVersion: Number,               // default: 0 (increment to revoke all sessions)
suspendedAt: Date,                    // suspension timestamp
suspendedUntil: Date,                 // suspension end time
suspendedBy: ObjectId,                // admin who suspended
suspensionReason: String              // reason for suspension
```

### 2FA Fields

```javascript
twoFactorEnabled: Boolean,            // default: false
twoFactorCodeToken: String,           // 2FA code hash (select: false)
twoFactorCodeExpires: Date            // 2FA code expiry (select: false)
```

### Role Field

```javascript
role: "customer" | "manufacturer" | "admin"; // required
```

---

## Authentication Flows

### 1. CREDENTIALS SIGNUP (Email + Password)

**Flow:**

```
User → Signup Form → POST /api/auth/register/customer
  ↓
Validate email/password
  ↓
Check email NOT already used (OAuth or Credentials)
  ↓
Create User:
  - authMethod: "credentials"
  - isEmailVerified: false
  - password: hashed
  ↓
Send verification email with token
  ↓
Email verification page
  ↓
POST /api/auth/verify-email with token
  ↓
User can now login with credentials
```

**Error Handling:**

- Email already registered (409)
- Email already registered via Google (409 with helpful message)
- Weak password validation (6+ chars)

**Database State After Signup:**

```javascript
{
  email: "user@example.com",
  password: "$2a$10$...", // hashed
  authMethod: "credentials",
  oauthProviders: [],
  isEmailVerified: false,
  emailVerificationToken: "...",
  emailVerificationExpires: Date(now + 24h)
}
```

---

### 2. CREDENTIALS LOGIN

**Flow:**

```
User → Login Form (email + password)
  ↓
POST /api/auth/[...nextauth]/route.js → Credentials Provider
  ↓
Find user by email
  ↓
Check user.isActive
  ↓
Check authMethod !== "oauth" (not OAuth-only account)
  ↓
Validate password with bcrypt.compare()
  ↓
Check user.isEmailVerified === true
  ↓
If twoFactorEnabled === true:
  - Generate 6-digit code
  - Email code to user
  - Throw TWO_FACTOR_REQUIRED error
  ↓
User enters 2FA code (if required)
  ↓
Create JWT session token
  ↓
Redirect to dashboard based on role
```

**Error Messages:**

- "Invalid credentials" - user not found or password wrong
- "Account is deactivated" - isActive: false
- "This account uses Google for login. Please sign in with Google instead." - OAuth-only account
- "EMAIL_NOT_VERIFIED" - email verification required
- "TWO_FACTOR_REQUIRED" - 2FA code needed
- "Your account is suspended" - active suspension

**Session Creation:**

- JWT contains: id, email, name, role, isEmailVerified, twoFactorEnabled, verificationStatus, businessName, sessionVersion
- Max age: 7 days
- Revalidation: Every 60 seconds (checks if user still active, not suspended, session version matches)

---

### 3. GOOGLE OAUTH SIGNUP/LOGIN

**Flow:**

```
User → Click "Sign in with Google"
  ↓
NextAuth Google Provider → Google Consent Screen
  ↓
User grants permissions → Google returns:
  - user.email (verified by Google)
  - user.name
  - user.image
  - account.provider: "google"
  - account.providerAccountId: "<googleId>"
  ↓
NextAuth signIn Callback:
  ↓
  ├─ If user NOT in DB:
  │  └─ Create new user:
  │     - authMethod: "oauth"
  │     - oauthProviders: [{
  │         provider: "google",
  │         providerId: "<googleId>",
  │         email: "user@gmail.com"
  │       }]
  │     - password: createRawToken(32) [random, unusable]
  │     - isEmailVerified: true [trusted from Google]
  │     - emailVerificationMethod: "oauth"
  │     - role: "customer" [hardcoded]
  │
  └─ If user EXISTS in DB:
     ├─ Check if Google provider already linked
     │  └─ If NO: Add to oauthProviders array
     │  └─ If authMethod was "credentials": Update to "oauth_credentials_mixed"
     │
     └─ Update lastLogin timestamp
     └─ Mark email verified if not already verified
```

**Important Notes:**

- OAuth users SKIP email verification requirement
- Google's provider email verification is trusted
- If credentials account exists but unverified, Google login marks it verified
- All OAuth users start as "customer" role (no manufacturer option)

**Session Creation:**

- User can immediately login after Google signup (no email verification needed)
- JWT session created same as credentials login

---

### 4. MIXED AUTH - CREDENTIALS + OAUTH

**Scenario**: User has credentials account, then logs in with Google (same email)

**Flow:**

```
User A:
  1. Signs up with Credentials (email: user@gmail.com)
  2. Verifies email manually
  3. Later clicks "Sign in with Google"
  4. Google returns same email

NextAuth signIn callback:
  ├─ Find user by email: user@gmail.com (FOUND - credentials user)
  ├─ Check if Google provider linked: NO
  └─ Add Google to oauthProviders:
     {
       provider: "google",
       providerId: "<googleId>",
       email: "user@gmail.com",
       linkedAt: now
     }
  └─ Update authMethod: "oauth_credentials_mixed"
  └─ Email already verified, leave as-is
  └─ Create session

Result:
  - User can now login with EITHER:
    - Credentials (email + password)
    - Google OAuth button
  - authMethod: "oauth_credentials_mixed" signals both are linked
```

---

### 5. EMAIL VERIFICATION FLOW

**For Credentials Users Only:**

```
User signs up with email/password
  ↓
POST /api/auth/register/customer
  ↓
Generate verification token: createRawToken(32)
  ↓
Store in DB: emailVerificationToken (hashed), emailVerificationExpires (24h)
  ↓
Send email via Resend with verification link:
  /auth/verify-email?token=<rawToken>
  ↓
User clicks link
  ↓
Frontend: Verify email page
  ↓
POST /api/auth/verify-email
  - Query: ?token=<rawToken>
  ↓
Backend validates:
  - Token hashes to stored token
  - Hasn't expired
  - User found
  ↓
Update DB:
  - isEmailVerified: true
  - emailVerifiedAt: now
  - emailVerificationMethod: "manual"
  - Clear verification token
  ↓
Success message + redirect to login
```

**For OAuth Users:**

- Email verification is AUTOMATIC via Google verification
- emailVerificationMethod: "oauth"
- No manual verification needed

**Resend Verification Email:**

```
POST /api/auth/resend-verification
- Required: email
- Action: Resend verification email if:
  - User exists
  - Email not verified
  - Not an OAuth-only account
```

---

### 6. TWO-FACTOR AUTHENTICATION (2FA)

**Setup (Optional):**

```
User enables 2FA in settings
  ↓
twoFactorEnabled: true in DB
```

**Login with 2FA Enabled:**

```
User enters email + password
  ↓
Credentials provider authorizes
  ↓
Check twoFactorEnabled: true
  ↓
Generate 6-digit numeric code: createNumericCode(6)
  ↓
Save to DB:
  - twoFactorCodeToken: hashToken(code)
  - twoFactorCodeExpires: now + 10 minutes
  ↓
Email code to user
  ↓
Throw: Error("TWO_FACTOR_REQUIRED")
  ↓
Frontend shows 2FA input
  ↓
User enters 6-digit code
  ↓
Login form resubmits with:
  - email
  - password
  - twoFactorCode: "123456"
  ↓
Backend validates:
  - Hash code and compare with stored token
  - Check expiration (10 min window)
  ↓
If valid: Complete login
If invalid: Throw Error("INVALID_TWO_FACTOR_CODE")
  ↓
Clear 2FA token from DB
```

---

### 7. PASSWORD RESET FLOW

**Forgot Password:**

```
User → Forgot password page
  ↓
POST /api/auth/forgot-password
  - email: user@example.com
  ↓
Find user
  ↓
Generate reset token: createRawToken(32)
  ↓
Save to DB:
  - passwordResetToken: hashToken(token)
  - passwordResetExpires: now + 1 hour
  ↓
Email reset link:
  /auth/reset-password/[token]
```

**Reset Password:**

```
User clicks email link
  ↓
Frontend: Reset password page
  ↓
POST /api/auth/reset-password
  - token: <resetToken>
  - newPassword: "new_secure_password"
  ↓
Backend validates:
  - Token matches stored (hashed)
  - Not expired (1 hour window)
  - User found
  ↓
Hash new password with bcryptjs
  ↓
Update DB:
  - password: newHashedPassword
  - Clear reset token fields
  ↓
Success message
```

---

### 8. SESSION MANAGEMENT & VALIDATION

**Session Strategy:**

- JWT-based, stateless
- Max age: 7 days (604,800 seconds)
- Revalidation: Every 60 seconds

**JWT Callback** (`lib/auth.js`):

```
When creating token:
  - Add user fields: id, role, verificationStatus, businessName, sessionVersion, isEmailVerified, twoFactorEnabled
  - Add validation timestamp: lastValidatedAt
  - Set sessionInvalid: false

When refreshing token (every 60 seconds):
  - Query DB for user by ID
  - Check: user exists, isActive, not suspended, sessionVersion matches
  - If ANY check fails:
    - Set token.sessionInvalid: true
    - Set token.sessionInvalidReason: "reason"
    - Delete sensitive fields from token
  - Update token.lastValidatedAt
```

**Session Callback** (on client):

```
Receives JWT token after validation
  ↓
If token.sessionInvalid:
  - Set session.error: "SESSION_INVALID"
  - Set session.errorReason: "<reason>"
  - Clear user.id and user.role
  ↓
Else:
  - Populate session.user with token fields
  - Client can check for session.error to detect invalid sessions
```

**Session Invalidation Triggers:**

```
1. User account deleted → token.sessionInvalid = true
2. User deactivated (isActive: false) → sessionInvalidReason: "deactivated"
3. Account suspended → sessionInvalidReason: "suspended"
4. Session version incremented → sessionInvalidReason: "version_mismatch"
   (Use case: Force logout on all devices)
```

**SessionProvider** (`app/SessionProvider.js`):

```
Wrapper around NextAuth SessionProvider
  ↓
Adds:
  - BfCache buster for browser back/forward navigation
  - Session event listeners:
    - onsignout: Clears cache, redirects to login
    - onCallback: Checks for session.error and handles invalidation
```

---

## API Endpoints

### Authentication Routes

| Route                             | Method   | Purpose                                 |
| --------------------------------- | -------- | --------------------------------------- |
| `/api/auth/[...nextauth]`         | GET/POST | NextAuth handler (login/logout)         |
| `/api/auth/register/customer`     | POST     | Customer signup with email/password     |
| `/api/auth/register/manufacturer` | POST     | Manufacturer signup with email/password |
| `/api/auth/verify-email`          | POST     | Verify email with token                 |
| `/api/auth/resend-verification`   | POST     | Resend verification email               |
| `/api/auth/forgot-password`       | POST     | Request password reset token            |
| `/api/auth/reset-password`        | POST     | Reset password with token               |
| `/api/auth/change-password`       | POST     | Change password (authenticated)         |
| `/api/auth/2fa/settings`          | GET/POST | Manage 2FA settings                     |
| `/api/auth/me`                    | GET      | Get current user info                   |
| `/api/auth/events`                | POST     | NextAuth event handler                  |

---

## Environment Variables Required

```bash
# NextAuth
NEXTAUTH_SECRET=<random-secret-64-chars>
NEXTAUTH_URL=http://localhost:3000  # or production URL

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Email Service (Resend)
RESEND_API_KEY=<your-resend-api-key>

# Database
MONGODB_URI=mongodb+srv://...
```

---

## Security Considerations

### ✅ Implemented

1. **Password Hashing**: bcryptjs with salt rounds
2. **JWT Tokens**: Signed with NEXTAUTH_SECRET
3. **Session Revalidation**: Every 60 seconds (checks account status)
4. **Session Version**: Increment to revoke all sessions
5. **Token Expiration**: Email verification (24h), Password reset (1h), 2FA codes (10 min)
6. **Protected Fields**: password, 2FA tokens, email verification tokens stored with `select: false`
7. **Account Suspension**: Checked on every session revalidation
8. **Email Verification**: Required for credentials users, automatic for OAuth users

### ⚠️ Considerations

1. **OAuth Password**: Generated random tokens for OAuth users are not usable for credentials login
   - Users must use OAuth button
   - Prevents accidental credentials login bypass
   - However, users CAN later link credentials if needed

2. **Email Verification Bypass**:
   - Credentials users: Must verify before login
   - OAuth users: Automatically verified (trusted from Google)
   - Mixed auth: Once verified (either method), no re-verification needed

3. **Cross-Device Sessions**:
   - All devices share same JWT max age (7 days)
   - To logout all devices: Increment user.sessionVersion

4. **Rate Limiting**:
   - Not currently implemented in auth routes
   - Recommendation: Add rate limiting on signup/login endpoints

5. **CSRF Protection**:
   - NextAuth handles CSRF protection automatically

---

## Error Messages & Handling

### Login Error Messages

| Error                                   | Cause                                     | Solution             |
| --------------------------------------- | ----------------------------------------- | -------------------- |
| "Invalid credentials"                   | Email not found or password wrong         | Check email/password |
| "Account is deactivated"                | isActive: false                           | Contact support      |
| "This account uses Google for login..." | OAuth-only account attempting credentials | Use Google button    |
| "Please verify your email..."           | isEmailVerified: false                    | Verify email first   |
| "A 2FA code was sent..."                | 2FA enabled, code required                | Enter 6-digit code   |
| "Invalid or expired 2FA code"           | Code wrong or expired (10 min)            | Request new code     |
| "Your account is suspended"             | Active suspension from admin              | Contact support      |

### Registration Error Messages

| Error                                 | Cause                         | Solution                 |
| ------------------------------------- | ----------------------------- | ------------------------ |
| "Name, email, password required"      | Missing fields                | Fill all required fields |
| "Invalid email format"                | Email doesn't match regex     | Use valid email          |
| "Password must be 6+ characters"      | Weak password                 | Use longer password      |
| "Email already registered"            | Email used before             | Use different email      |
| "Email already registered via Google" | OAuth account with same email | Sign in with Google      |

---

## Frontend Integration

### Using NextAuth in Components

**Client Components:**

```javascript
"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") {
    return <button onClick={() => signIn()}>Sign In</button>;
  }

  return (
    <div>
      Welcome, {session.user.name}!
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

**Server Components:**

```javascript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return <div>Welcome, {session.user.name}</div>;
}
```

**API Routes:**

```javascript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User is authenticated, process request
}
```

---

## Troubleshooting

### Session Invalidation Issues

**Symptom**: User logged out automatically, session.error: "SESSION_INVALID"

**Possible Causes**:

1. User account deleted
2. User deactivated
3. Account suspended
4. Session version incremented

**Solution**:

- Check user record in DB
- Verify `isActive: true`
- Verify `suspendedAt: null`
- Check `sessionVersion` matches token

### OAuth Login Fails

**Symptom**: "signIn failed" or blank page

**Possible Causes**:

1. Env vars not set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
2. Callback URL not configured in Google Console
3. NEXTAUTH_SECRET not set

**Solution**:

- Verify all env vars are set
- Check Google OAuth app settings
- Regenerate NEXTAUTH_SECRET if needed

### Email Verification Email Not Received

**Possible Causes**:

1. Resend API key invalid
2. Email domain not verified (if using custom domain)
3. Email in spam folder
4. Rate limiting on sending

**Solution**:

- Check Resend dashboard for delivery status
- Use resend-verification endpoint to retry
- Check spam folder

---

## Migration Guide - Facebook Removal

**Changes Made (v1.1)**:

1. Removed FacebookProvider from lib/auth.js
2. Removed Facebook buttons from login page
3. Removed Facebook buttons from signup page
4. Removed facebook.png imports

**For Existing Users**:

- Facebook users cannot login after removal
- Recommendation: Notify users to use Google or reset password for credentials login
- If Facebook account linked + credentials account, they can use Google or credentials

---

## Future Enhancements

1. **Rate Limiting**: Add to login/signup endpoints
2. **Device Management**: Allow users to see/revoke active sessions
3. **Passwordless Auth**: Email magic links
4. **Social Login Linking**: Let users link/unlink OAuth providers
5. **Manufacturer OAuth Signup**: Allow manufacturers to signup via Google
6. **Advanced 2FA**: TOTP authentication (authenticator apps)
7. **Account Recovery**: Recovery codes for 2FA
8. **Login History**: Track login attempts and locations
9. **Session Timeout**: Auto-logout on inactivity
10. **API Keys**: For third-party integrations

---

## Testing Checklist

- [ ] Test credentials signup with valid/invalid data
- [ ] Test email verification flow
- [ ] Test credentials login (verified & unverified email)
- [ ] Test password reset flow
- [ ] Test 2FA login flow
- [ ] Test Google OAuth signup
- [ ] Test Google OAuth login
- [ ] Test mixed auth (credentials + Google same email)
- [ ] Test OAuth-only account cannot use credentials
- [ ] Test session revalidation (should still work after 60+ seconds)
- [ ] Test session invalidation (increment sessionVersion)
- [ ] Test suspension/deactivation logout
- [ ] Test "forgot password" email sending
- [ ] Test invalid error handling on all forms
- [ ] Test resend verification email
- [ ] Test 2FA code expiration (10 min)
- [ ] Test concurrent device login
- [ ] Test browser back/forward caching behavior

---

**Last Updated**: April 30, 2026  
**Version**: 1.1 (Facebook Removed, OAuth Provider Tracking Added)
