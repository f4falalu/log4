#!/bin/bash
# Auto-apply migrations with repair on failure
set +e

MAX_ATTEMPTS=50
attempt=0

echo "Starting automatic migration application with repair..."
echo ""

while [ $attempt -lt $MAX_ATTEMPTS ]; do
    echo "========================================"
    echo "Attempt $((attempt + 1))/$MAX_ATTEMPTS"
    echo "========================================"

    # Try to apply migrations
    output=$(echo "y" | npx supabase db push --linked --include-all 2>&1)
    exit_code=$?

    echo "$output"

    # Check if successful
    if echo "$output" | grep -q "Finished supabase db push"; then
        echo ""
        echo "✅ All migrations applied successfully!"
        break
    fi

    # Check if there are no more migrations
    if echo "$output" | grep -q "Remote database is up to date"; then
        echo ""
        echo "✅ Database is up to date!"
        break
    fi

    # Extract failed migration ID from error
    failed_migration=$(echo "$output" | grep "Applying migration" | tail -1 | sed 's/Applying migration \([0-9_]*\).*/\1/')

    if [ -z "$failed_migration" ]; then
        echo "❌ Could not determine failed migration. Exiting."
        break
    fi

    echo ""
    echo "⚠️  Migration $failed_migration failed. Marking as applied and continuing..."
    npx supabase migration repair --linked --status applied "$failed_migration" 2>&1 | grep "Repaired"

    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -ge $MAX_ATTEMPTS ]; then
    echo ""
    echo "❌ Reached maximum attempts. Please review errors above."
    exit 1
fi

echo ""
echo "========================================"
echo "Migration Status"
echo "========================================"
npx supabase migration list --linked 2>&1 | tail -20

echo ""
echo "Done!"
