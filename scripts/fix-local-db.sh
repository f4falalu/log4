#!/bin/bash
# Fix Local Supabase Database
# This script performs a clean reset of your local Supabase environment

set -e  # Exit on any error

echo "🔧 BIKO Local Database Recovery Script"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will destroy all local database data!"
echo "    Production database is NOT affected."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "Step 1/5: Stopping Supabase services..."
supabase stop || echo "⚠️  No services to stop"

echo ""
echo "Step 2/5: Removing all Supabase containers..."
docker ps -a --filter name=supabase --format "{{.Names}}" | while read container; do
    echo "  - Removing $container"
    docker rm -f "$container" 2>/dev/null || true
done

echo ""
echo "Step 3/5: Removing all Supabase volumes..."
docker volume ls --filter label=com.supabase.cli.project=cenugzabuzglswikoewy --format "{{.Name}}" | while read volume; do
    echo "  - Removing $volume"
    docker volume rm "$volume" 2>/dev/null || true
done

echo ""
echo "Step 4/5: Starting fresh Supabase instance..."
echo "  This may take 1-2 minutes..."
if supabase start; then
    echo "✅ Supabase started successfully!"
else
    echo "❌ Failed to start Supabase"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Docker Desktop is running"
    echo "  2. Run: docker ps"
    echo "  3. Check logs: supabase start --debug"
    exit 1
fi

echo ""
echo "Step 5/5: Verifying database..."

# Check migrations
MIGRATION_COUNT=$(docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -t -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations;" 2>/dev/null | xargs)
echo "  - Migrations applied: $MIGRATION_COUNT"

# Check critical tables
echo "  - Checking critical tables..."
TABLES=$(docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_roles', 'delivery_batches', 'facilities', 'warehouses');" 2>/dev/null | xargs)
echo "    • Critical tables found: $TABLES/4"

# Check RLS policies
echo "  - Checking RLS policies..."
POLICIES=$(docker exec supabase_db_cenugzabuzglswikoewy psql -U postgres -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_roles';" 2>/dev/null | xargs)
echo "    • user_roles policies: $POLICIES"

echo ""
echo "======================================"
if [ "$MIGRATION_COUNT" -gt 0 ] && [ "$TABLES" -eq 4 ] && [ "$POLICIES" -eq 3 ]; then
    echo "✅ SUCCESS! Database is healthy"
    echo ""
    echo "Next steps:"
    echo "  1. Clear Vite cache: rm -rf node_modules/.vite"
    echo "  2. Restart dev server: npm run dev (or bun dev)"
    echo "  3. Test at http://localhost:8080"
else
    echo "⚠️  WARNING: Database may not be fully initialized"
    echo ""
    echo "Expected:"
    echo "  - Migrations: 50+"
    echo "  - Tables: 4/4"
    echo "  - Policies: 3"
    echo ""
    echo "Actual:"
    echo "  - Migrations: $MIGRATION_COUNT"
    echo "  - Tables: $TABLES/4"
    echo "  - Policies: $POLICIES"
    echo ""
    echo "Run with --debug: supabase start --debug"
fi
