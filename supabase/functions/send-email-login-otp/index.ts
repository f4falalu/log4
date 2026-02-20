// Edge Function: Send Email Login OTP
// Sends 6-digit OTP code via email for driver authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailOTPRequest {
  email: string;
}

interface OTPResponse {
  success: boolean;
  code?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email }: EmailOTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client (anon key - no auth required for login OTP)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Generate OTP via RPC
    const { data: otpData, error: otpError } = await supabase.rpc(
      'generate_email_login_otp',
      { p_email: email }
    ) as { data: OTPResponse | null; error: any };

    if (otpError || !otpData?.success || !otpData?.code) {
      return new Response(
        JSON.stringify({
          error: otpData?.error || otpError?.message || 'Failed to generate OTP'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email with OTP
    const emailSent = await sendOTPEmail(email, otpData.code);

    if (!emailSent) {
      return new Response(
        JSON.stringify({ error: 'Failed to send OTP email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent to email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-email-login-otp:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Send OTP email using configured email service
 *
 * Configure via environment variables:
 * - EMAIL_SERVICE: 'console' | 'resend' | 'sendgrid' (default: 'console')
 * - RESEND_API_KEY: API key for Resend (if using Resend)
 * - SENDGRID_API_KEY: API key for SendGrid (if using SendGrid)
 * - FROM_EMAIL: Sender email address (default: noreply@biko.app)
 *
 * For development/testing, use EMAIL_SERVICE=console to log OTP to console
 */
async function sendOTPEmail(to: string, code: string): Promise<boolean> {
  const emailService = Deno.env.get('EMAIL_SERVICE') || 'console';
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'MOD4 <noreply@biko.app>';

  // Email content
  const subject = `Your MOD4 Login Code: ${code}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #f59e0b, #eab308); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #fef3c7; border-radius: 8px; margin: 20px 0; color: #92400e; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MOD4 Driver Login</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You requested to sign in to your MOD4 driver account. Use the code below to complete your login:</p>
      <div class="code">${code}</div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Offline-first · Event-sourced · Field-ready</p>
      <p>MOD4 Driver Platform by BIKO</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
MOD4 Driver Login

Your login code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

---
MOD4 Driver Platform by BIKO
  `.trim();

  // Send via configured service
  try {
    if (emailService === 'console') {
      // Development mode: Log OTP to console (check function logs)
      console.log('='.repeat(60));
      console.log(`📧 OTP Email for: ${to}`);
      console.log(`🔢 Login Code: ${code}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('='.repeat(60));
      console.log(`Plain text email:\n${text}`);
      console.log('='.repeat(60));
      return true;
    } else if (emailService === 'resend') {
      return await sendViaResend(fromEmail, to, subject, html, text);
    } else if (emailService === 'sendgrid') {
      return await sendViaSendGrid(fromEmail, to, subject, html, text);
    } else {
      console.error(`Unsupported email service: ${emailService}`);
      return false;
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Resend Email Service
async function sendViaResend(
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend API error:', error);
    return false;
  }

  return true;
}

// SendGrid Email Service
async function sendViaSendGrid(
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) {
    console.error('SENDGRID_API_KEY not configured');
    return false;
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.includes('<') ? from.split('<')[1].split('>')[0] : from },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('SendGrid API error:', error);
    return false;
  }

  return true;
}
