# MOD4 Simple Authentication Setup

## Overview
MOD4 driver app uses **Supabase-only** authentication with no external email dependencies.

## Login Methods

### 1. Email + Password Login
- **How it works**: Drivers enter email and password
- **Uses**: Supabase `signInWithPassword()`
- **No email required**: Works immediately, no SMTP configuration
- **Best for**: First-time login on new devices

### 2. PIN Login
- **How it works**: Returning drivers enter 4-digit PIN
- **Uses**: Device-linked localStorage + Supabase auth
- **Stored**: Email saved in `localStorage.setItem('mod4_linked_email', email)`
- **Best for**: Daily driver logins on same device

### 3. Activate Account
- **How it works**: New drivers use admin-generated OTP to activate
- **Flow**: Admin creates driver → Generates OTP → Driver activates with OTP + sets PIN
- **Best for**: Driver onboarding

### 4. Request Access
- **How it works**: New drivers request access, admin approves
- **Flow**: Driver submits request → Admin approves → Driver gets notified
- **Best for**: Self-service onboarding

## What Was Removed

### ❌ Forgot Password
- **Why removed**: Requires SMTP configuration (email service)
- **Alternative**: Admins can reset passwords via Supabase Dashboard
- **Path**: Dashboard > Auth > Users > [User] > Reset Password

### ❌ Email OTP Login
- **Why removed**: Complex, requires email service or console logs
- **Alternative**: Use email/password login instead
- **Note**: Edge function still exists but isn't used

## For Production

### If you want "Forgot Password" later:

**Option 1: Use Gmail SMTP** (Free)
1. Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/auth)
2. Enable "Custom SMTP"
3. Configure:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your Gmail
   - Password: [Gmail App Password](https://myaccount.google.com/apppasswords)

**Option 2: Use Resend** (Professional, free tier 3k/month)
1. Configure SMTP:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: Your Resend API key
2. Then also enable custom OTP via edge function

**Option 3: Keep it simple** (Recommended)
- Leave as-is
- Admins handle password resets manually
- Drivers use PIN for daily access

## Current Configuration

### Supabase Auth Settings
- ✅ Email/Password auth enabled
- ❌ Email confirmations: Not required
- ❌ Custom SMTP: Disabled (using simple email/password only)

### Edge Function: send-email-login-otp
- **Status**: Deployed but not used
- **Config**: `EMAIL_SERVICE=console`
- **Note**: Can be enabled later if needed

### Login Screen States
- **Default**: PIN login OR Activate/Request Access/Sign in with Email buttons
- **Email mode**: Email + password fields only
- **No OTP mode**: Removed
- **No Reset Password mode**: Removed

## Testing

### Test Driver Account
1. Create in [Supabase Dashboard](https://supabase.com/dashboard/project/cenugzabuzglswikoewy/auth/users)
2. Email: `testdriver@example.com`
3. Password: `Test123!`
4. Auto-confirm: ✅

### Test Flow
1. Open: http://localhost:3002/login
2. Click: "Sign in with Email"
3. Enter credentials
4. Should log in successfully
5. Next time: Use PIN for faster access

## Architecture

```
MOD4 Login Flow:
┌─────────────────────────────────────┐
│  First Time / New Device            │
├─────────────────────────────────────┤
│  1. Email + Password                │
│     ↓                                │
│  2. Supabase Auth (signInWithPassword)│
│     ↓                                │
│  3. Store email in localStorage     │
│     ↓                                │
│  4. Redirect to Dashboard           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Returning Driver (Same Device)     │
├─────────────────────────────────────┤
│  1. Enter 4-digit PIN               │
│     ↓                                │
│  2. Retrieve email from localStorage│
│     ↓                                │
│  3. Supabase Auth with PIN as password│
│     ↓                                │
│  4. Redirect to Dashboard           │
└─────────────────────────────────────┘
```

## Benefits

### ✅ Zero Email Dependencies
- No SMTP configuration needed
- No third-party email services
- No domain verification

### ✅ Simple & Reliable
- Uses standard Supabase auth
- Fewer moving parts
- Less to maintain

### ✅ Good UX
- Email/password for first login
- PIN for daily access
- No "forgot password" confusion

### ✅ Admin Control
- Password resets via dashboard
- Full audit trail
- No automated email risks

## Support

For password resets, admins can:
1. Go to Supabase Dashboard > Auth > Users
2. Find the driver's email
3. Click user → "Reset Password"
4. Either set a new password OR send reset email (if SMTP is configured)

---

Last updated: 2026-02-19
Configuration: Supabase-only, no email dependencies
