#!/usr/bin/env sh
# Applies the Supabase migrations to a throwaway Postgres container and runs the RLS tests.
# Needs Docker. Uses a minimal auth stand-in (supabase/tests/rls_harness.sql), not a real Supabase stack.
set -eu
# Git Bash on Windows would otherwise rewrite container paths like /tmp/run.sql.
export MSYS_NO_PATHCONV=1
IMAGE="${PG_IMAGE:-postgres:17-alpine}"
NAME="xlpro-rls-test-$$"
# `pwd -W` gives a Windows path under Git Bash/MSYS that docker.exe understands; elsewhere use pwd.
ROOT="$(cd "$(dirname "$0")/.." && (pwd -W 2>/dev/null || pwd))"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
i=0
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 60 ] && { echo "Postgres did not start"; exit 1; }; sleep 1
done
sleep 1

run() { docker cp "$1" "$NAME:/tmp/run.sql" && docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/run.sql; }
run "$ROOT/supabase/tests/rls_harness.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f"; done
run "$ROOT/supabase/tests/valuation_persistence_test.sql" | grep -q 'ALL RLS TESTS PASSED'
echo "Supabase RLS tests passed"
