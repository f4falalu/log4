#!/bin/bash
# Quick Credential Rotation Helper Script
# This script helps you rotate Supabase credentials quickly

set -e

echo "=================================="
echo "🔐 Supabase Credential Rotation"
echo "=================================="
echo ""
echo "⚠️  WARNING: This script will help you rotate credentials."
echo "Make sure you have the new keys ready from Supabase dashboard!"
echo ""
echo "📋 Before running this script:"
echo "   1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/api"
echo "   2. Click 'Reset API keys' or generate new keys"
echo "   3. Copy BOTH the new anon key and service role key"
echo ""

read -p "Have you generated new keys? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Please generate new keys first, then run this script again."
    exit 1
fi

echo ""
echo "=================================="
echo "Step 1: Update Local .env File"
echo "=================================="
echo ""

read -p "Enter your NEW Supabase Anon Key: " NEW_ANON_KEY
if [ -z "$NEW_ANON_KEY" ]; then
    echo "❌ Anon key cannot be empty!"
    exit 1
fi

# Create .env file
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="cenugzabuzglswikoewy"
VITE_SUPABASE_URL="https://cenugzabuzglswikoewy.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="$NEW_ANON_KEY"
EOF

echo "✅ Created .env file with new anon key"
echo ""

echo "=================================="
echo "Step 2: Update Edge Functions Secret"
echo "=================================="
echo ""

read -p "Enter your NEW Supabase Service Role Key: " NEW_SERVICE_ROLE_KEY
if [ -z "$NEW_SERVICE_ROLE_KEY" ]; then
    echo "❌ Service role key cannot be empty!"
    exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Install with: npm install -g supabase"
    echo ""
    echo "Manual step required:"
    echo "Run: npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=\"$NEW_SERVICE_ROLE_KEY\""
else
    echo "Setting Edge Functions secret..."
    npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY"
    echo "✅ Edge Functions secret updated"
fi

echo ""
echo "=================================="
echo "Step 3: Netlify Environment Variables"
echo "=================================="
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo ""
echo "1. Go to: https://app.netlify.com/sites/zesty-lokum-5d0fe1/settings/env"
echo "2. Update this variable:"
echo "   VITE_SUPABASE_PUBLISHABLE_KEY = $NEW_ANON_KEY"
echo "3. Trigger a new deployment:"
echo "   https://app.netlify.com/sites/zesty-lokum-5d0fe1/deploys"
echo ""
read -p "Press ENTER when you've updated Netlify..."

echo ""
echo "=================================="
echo "Step 4: Test Everything"
echo "=================================="
echo ""

echo "Testing local development..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
    echo ""
    echo "To test local dev server, run:"
    echo "   npm run dev"
else
    echo "⚠️  node_modules not found. Run 'npm install' first."
fi

echo ""
echo "Testing production deployment..."
echo "Visit: https://zesty-lokum-5d0fe1.netlify.app"
echo "Try to login and verify everything works."
echo ""

read -p "Did everything work? (yes/no): " WORKS
if [ "$WORKS" != "yes" ]; then
    echo ""
    echo "⚠️  Troubleshooting tips:"
    echo "   1. Check browser console for errors"
    echo "   2. Verify Netlify deployment completed"
    echo "   3. Verify keys in Supabase dashboard are active"
    echo "   4. Check Edge Functions secrets: npx supabase secrets list"
    echo ""
    exit 1
fi

echo ""
echo "=================================="
echo "Step 5: Revoke Old Keys"
echo "=================================="
echo ""
echo "⚠️  CRITICAL FINAL STEP:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/api"
echo "2. Find the OLD keys section"
echo "3. Click 'Revoke' on the old anon and service role keys"
echo "4. Confirm revocation"
echo ""
echo "⚠️  WARNING: Only revoke AFTER confirming everything works!"
echo "            Revoking will immediately invalidate old keys."
echo ""

read -p "Have you revoked the old keys? (yes/no): " REVOKED
if [ "$REVOKED" = "yes" ]; then
    echo ""
    echo "=================================="
    echo "✅ ROTATION COMPLETE!"
    echo "=================================="
    echo ""
    echo "🎉 All credentials have been successfully rotated!"
    echo ""
    echo "Next steps:"
    echo "   1. Monitor Supabase logs for any issues"
    echo "   2. Inform team members about the rotation"
    echo "   3. Update this checklist: SECURITY_CLEANUP_COMPLETE.md"
    echo ""
    echo "Security recommendations:"
    echo "   - Set up git-secrets: brew install git-secrets"
    echo "   - Enable GitHub secret scanning"
    echo "   - Review Supabase access logs for Nov 14 - Dec 26"
    echo ""
else
    echo ""
    echo "⚠️  Remember to revoke old keys once you've verified everything!"
    echo "Don't forget this critical final step!"
    echo ""
fi

echo "=================================="
echo "Documentation"
echo "=================================="
echo ""
echo "For detailed information, see:"
echo "   - CREDENTIAL_ROTATION_GUIDE.md"
echo "   - SECURITY_CLEANUP_REPORT.md"
echo "   - SECURITY_CLEANUP_COMPLETE.md"
echo ""
