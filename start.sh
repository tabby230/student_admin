#!/usr/bin/env bash
# EduTrack - local dev launcher
# Starts the local MariaDB instance (port 3307) and the PHP built-in server.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(dirname "$ROOT")/mysql-data"
RUN_DIR="$(dirname "$ROOT")/mysql-run"
PORT="${PORT:-8001}"

if [ ! -d "$DB_DIR/mysql" ]; then
  echo "[setup] initialising MariaDB data directory..."
  mkdir -p "$RUN_DIR"
  mariadb-install-db --basedir=/usr --datadir="$DB_DIR" \
    --auth-root-authentication-method=normal --user="$(whoami)" >/dev/null
fi

if ! mysqladmin -h127.0.0.1 -P3307 -uroot ping >/dev/null 2>&1; then
  echo "[db] starting MariaDB on 127.0.0.1:3307..."
  mkdir -p "$RUN_DIR"
  setsid nohup mariadbd --datadir="$DB_DIR" --basedir=/usr --user="$(whoami)" \
    --port=3307 --socket="$RUN_DIR/mysqld.sock" --pid-file="$RUN_DIR/mysqld.pid" \
    --log-error="$RUN_DIR/error.log" --bind-address=127.0.0.1 </dev/null >/dev/null 2>&1 &
  for _ in $(seq 1 30); do
    mysqladmin -h127.0.0.1 -P3307 -uroot ping >/dev/null 2>&1 && break
    sleep 1
  done
fi
echo "[db] ready"

if ! mysql -h127.0.0.1 -P3307 -uroot edutrack -e "SELECT 1" >/dev/null 2>&1; then
  echo "[db] importing schema + seed data..."
  mysql -h127.0.0.1 -P3307 -uroot < "$ROOT/database/schema.sql"
  mysql -h127.0.0.1 -P3307 -uroot edutrack < "$ROOT/database/seed.sql"
fi
echo "[db] edutrack ready"

echo "[web] http://127.0.0.1:$PORT/"
exec php -S "127.0.0.1:$PORT" -t "$ROOT"
