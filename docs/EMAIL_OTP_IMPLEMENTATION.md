# Email OTP Login Implementation

## Overview

Implemented a **custom numeric OTP system** for MOD4 driver authentication. Drivers now receive a **6-digit code via email** (like SMS verification) instead of a clickable magic link.

## What Changed

### 1. Database Layer

**Tables:**
- `email_login_otps`: Stores OTP codes with 10-minute expiration

**RPC Functions:**
- `generate_email_login_otp(email)`: Generates 6-digit code
- `verify_email_login_otp(email, code)`: Verifies code and creates session

**Location:** `supabase/migrations/20260219100000_create_email_login_otp_system.sql`

### 2. Edge Function

**Function:** `send-email-login-otp`
- Generates OTP via RPC
- Sends professional email with 6-digit code
- Supports Resend and SendGrid

**Location:** `supabase/functions/send-email-login-otp/`

### 3. MOD4 App

**Updated Files:**
- `src/stores/authStore.ts`: Custom OTP logic
- `src/pages/Login.tsx`: Updated UI text for numeric codes

**Flow:**
1. Driver enters email → clicks "Send OTP"
2. Edge function generates code → sends email
3. Driver receives email with 6-digit code
4. Driver enters code in app
5. App verifies code → signs driver in

## Setup Required

### Step 1: Configure Email Service

Choose **Resend** (recommended) or **SendGrid**:

#### Resend Setup (Easier)

1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. In Supabase Dashboard → Edge Functions → Configuration:
   ```
   EMAIL_SERVICE=resend
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   FROM_EMAIL=MOD4 <noreply@biko.app>
   ```

#### SendGrid Setup

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key with "Mail Send" permission
3. In Supabase Dashboard → Edge Functions → Configuration:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   FROM_EMAIL=noreply@biko.app
   ```

### Step 2: Deploy Edge Function

```bash
cd /Users/fbarde/Documents/log4/log4
supabase functions deploy send-email-login-otp
```

### Step 3: Test Locally (Optional)

Create `supabase/.env.local`:
```bash
EMAIL_SERVICE=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=MOD4 <noreply@biko.app>
```

Run locally:
```bash
supabase functions serve send-email-login-otp --env-file supabase/.env.local
```

### Step 4: Verify Domain (Production Only)

For production emails from `@biko.app`:

**Resend:**
1. Dashboard → Domains → Add Domain
2. Add DNS records provided
3. Wait for verification

**SendGrid:**
1. Settings → Sender Authentication
2. Add DNS records provided
3. Wait for verification

## User Flow

### Returning Driver Login (Email OTP)

```
1. Driver opens MOD4 app (localhost:3002/login)
2. No linkedEmail stored
3. Driver clicks "Sign in with Email"
4. Enters email → clicks "Send OTP instead"
5. Receives email: "Your MOD4 Login Code: 482917"
6. Enters 482917 in app
7. Logged in! ✅
```

### Email Template Preview

```
┌─────────────────────────────────────┐
│      MOD4 Driver Login              │
│   (Amber gradient header)           │
├─────────────────────────────────────┤
│                                     │
│  Hello,                             │
│                                     │
│  You requested to sign in to your  │
│  MOD4 driver account. Use the code │
│  below:                             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      4 8 2 9 1 7            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Expires in 10 minutes.             │
│                                     │
└─────────────────────────────────────┘
```

## Security Features

✅ 6-digit random codes (1,000,000 possibilities)
✅ 10-minute expiration
✅ One-time use (marked as used after verification)
✅ Temporary password for session creation
✅ Auto-cleanup of expired codes
✅ Rate limiting (via Supabase edge function limits)

## Testing

### Development Mode

In development, the code is logged to console for easy testing:

```typescript
// Console output when OTP is requested
[DEV] OTP Code for driver@example.com: 482917
```

### Production Mode

In production, codes are ONLY sent via email (no console logging).

## Troubleshooting

### "Failed to send OTP"
- Check edge function is deployed: `supabase functions list`
- Verify environment variables are set
- Check Resend/SendGrid dashboard for errors

### Email not received
- Check spam folder
- Verify email service API key is valid
- Check domain is authenticated (production)
- View logs: `supabase functions logs send-email-login-otp`

### "Invalid or expired OTP code"
- Code expired (10 minutes)
- Code already used
- Typo in code
- Request new code

## Next Steps

1. **Deploy edge function**: `supabase functions deploy send-email-login-otp`
2. **Configure email service** (Resend or SendGrid)
3. **Test in development** (check console for codes)
4. **Verify domain** (for production emails)
5. **Test end-to-end** with real emails

## Files Changed

```
📁 log4/
├── supabase/
│   ├── migrations/
│   │   ├── 20260219100000_create_email_login_otp_system.sql ✨ NEW
│   │   └── 20260219100001_update_otp_verification_with_temp_password.sql ✨ NEW
│   └── functions/
│       └── send-email-login-otp/ ✨ NEW
│           ├── index.ts
│           └── README.md
└── mod4/
    ├── src/
    │   ├── stores/
    │   │   └── authStore.ts ✏️ UPDATED (custom OTP)
    │   └── pages/
    │       └── Login.tsx ✏️ UPDATED (UI text)
    └── docs/
        └── EMAIL_OTP_IMPLEMENTATION.md ✨ NEW (this file)
```

## Support

- Edge Function Docs: `supabase/functions/send-email-login-otp/README.md`
- Resend Docs: https://resend.com/docs
- SendGrid Docs: https://docs.sendgrid.com

---

**Status:** ✅ Implementation Complete
**Next:** Configure email service and deploy edge function
