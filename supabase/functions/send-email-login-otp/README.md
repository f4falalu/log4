# Email Login OTP Edge Function

Sends 6-digit numeric OTP codes via email for driver authentication in MOD4 app.

## Features

- Generates secure 6-digit OTP codes
- 10-minute expiration
- Beautiful HTML email template
- Supports multiple email providers (Resend, SendGrid)
- CORS-enabled for direct client calls

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy send-email-login-otp
```

### 2. Configure Email Service

Set the required environment variables in Supabase Dashboard → Edge Functions → Configuration:

#### Option A: Resend (Recommended)

```bash
EMAIL_SERVICE=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=MOD4 <noreply@biko.app>
```

**Get Resend API Key:**
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys → Create API Key
3. Copy the key

#### Option B: SendGrid

```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@biko.app
```

**Get SendGrid API Key:**
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys → Create API Key
3. Give it "Mail Send" permissions
4. Copy the key

### 3. Verify Domain (Production)

To send emails from your domain:

**Resend:**
1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `biko.app`)
3. Add DNS records to your domain provider
4. Wait for verification

**SendGrid:**
1. Go to Settings → Sender Authentication
2. Authenticate your domain
3. Add DNS records
4. Wait for verification

## Local Development

For local testing, set environment variables in `.env.local`:

```bash
# In supabase/.env.local
EMAIL_SERVICE=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=MOD4 <noreply@biko.app>
```

Run locally:
```bash
supabase functions serve send-email-login-otp --env-file supabase/.env.local
```

## Usage

The MOD4 app calls this edge function automatically when a driver requests email login:

```typescript
const { data, error } = await supabase.functions.invoke('send-email-login-otp', {
  body: { email: 'driver@example.com' },
});
```

## Email Template

The OTP email includes:
- Professional HTML design with BIKO branding
- Large, easy-to-read 6-digit code
- 10-minute expiration notice
- Security reminder
- Plain text fallback

## Security

- OTP codes are stored hashed in the database
- 10-minute expiration enforced
- One-time use only
- Rate limiting recommended (configure in Supabase)

## Troubleshooting

### "RESEND_API_KEY not configured"
- Set the environment variable in Supabase Dashboard
- Redeploy the function after adding env vars

### "Failed to send email"
- Check API key is correct
- Verify domain is authenticated (for production)
- Check Resend/SendGrid dashboard for errors

### OTP not received
- Check spam folder
- Verify email address is correct
- Check Resend/SendGrid logs
- Try a different email provider
