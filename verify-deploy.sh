#!/usr/bin/env bash
# EduTrack - post-deploy verification against the live site.
#
# Usage:
#   ./verify-deploy.sh                          # uses nexcollageengineering.free.nf
#   ./verify-deploy.sh nexcollageengineering.free.nf
#   HOST_OVERRIDE=185.27.134.141 ./verify-deploy.sh   # bypass DNS with a Host header
set -uo pipefail

HOST="${1:-nexcollageengineering.free.nf}"
BASE_HOST="$HOST"
BASE="http://${BASE_HOST}"

curl_probe() {
  # $1 = path, $2 = label
  if [ -n "${HOST_OVERRIDE:-}" ]; then
    code=$(curl -s -m 20 -o /tmp/vd.body -w '%{http_code}' -H "Host: ${BASE_HOST}" "${BASE_HOST_OVERRIDE_IP:-$HOST_OVERRIDE}/$1" 2>/dev/null)
    url="$HOST_OVERRIDE/$1 (Host: $BASE_HOST)"
  else
    code=$(curl -s -m 20 -o /tmp/vd.body -w '%{http_code}' "$BASE/$1" 2>/dev/null)
    url="$BASE/$1"
  fi
  size=$(stat -c '%s' /tmp/vd.body 2>/dev/null || echo 0)
  printf '%-34s %s  %sb\n' "$2" "$code" "$size"
  [ -n "$code" ] && [ "$code" != "000" ] && [ "$size" -gt 0 ] && head -c 220 /tmp/vd.body && echo
  return 0
}

echo "target: ${url:-http://$HOST}"
echo "--- static ---"
curl_probe "index.html"       "index.html"
curl_probe "students.html"    "students.html"
curl_probe "css/style.css"    "css/style.css"
curl_probe "js/api.js"        "js/api.js"
curl_probe "assets/images/logo.png" "logo.png"

echo
echo "--- api (200 + JSON = DB reachable) ---"
for ep in stats departments semesters results analytics top-performers; do
  curl_probe "api/$ep.php" "api/$ep.php"
done

echo
echo "--- must be absent (security) ---"
for ep in "database/schema.sql" "api/config.php" "start.sh" "README.md" "assets/3dmodel/moon.glb"; do
  if [ -n "${HOST_OVERRIDE:-}" ]; then
    code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -H "Host: $BASE_HOST" "$HOST_OVERRIDE/$ep")
  else
    code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$BASE/$ep")
  fi
  case "$code" in
    200|403) printf '%-34s %s  LEAKED\n' "$ep" "$code" ;;
    *)       printf '%-34s %s  ok\n'   "$ep" "$code" ;;
  esac
done

echo
echo "diagnosis:"
code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' ${HOST_OVERRIDE:+-H "Host: $BASE_HOST"} "$BASE/index.html" 2>/dev/null)
case "$code" in
  503) echo "  503 on every path incl. nonexistent files => account web vhost is not serving."
       echo "  This is account-side (provisioning/suspension/domain not active), not a file problem." ;;
  404) echo "  404 => vhost is serving but the document root is wrong or files are not in htdocs." ;;
  200) echo "  200 => site is up. If api/*.php return 503, the DB credentials in"
       echo "  api/config.local.php are wrong (user/pass), and the site is otherwise fine." ;;
  000) echo "  000 => no connection / DNS not resolving yet." ;;
  *)   echo "  $code" ;;
esac
