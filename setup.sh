#!/usr/bin/env bash
# One-step setup for Heartfelt.
#
#   ./setup.sh                          ask a couple of questions, then start
#   ./setup.sh --domain cards.example.com   public site with HTTPS
#   ./setup.sh --node                   run with Node instead of Docker
#   ./setup.sh --yes                    no questions, use defaults
#
# Safe to run again: it keeps your existing .env and data.
set -euo pipefail
cd "$(dirname "$0")"

MODE="" DOMAIN_ARG="" ASSUME_YES=0 BUILD="--build"
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN_ARG="${2:-}"; shift ;;
    --domain=*) DOMAIN_ARG="${1#*=}" ;;
    --docker) MODE=docker ;;
    --node) MODE=node ;;
    --no-build) BUILD="" ;;   # reuse an image that is already built
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 1 ;;
  esac
  shift
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; exit 1; }
has()  { command -v "$1" >/dev/null 2>&1; }

get_env() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
set_env() {  # replace KEY=... in .env, or append it
  (umask 077; awk -v k="$1" -v v="$2" 'BEGIN{d=0} $0 ~ "^"k"=" {print k"="v; d=1; next} {print} END{if(!d) print k"="v}' .env > .env.tmp)
  mv .env.tmp .env
  chmod 600 .env
}

bold "Heartfelt setup"

# ---- 1. Settings file ----
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created .env"
else
  ok "Using your existing .env"
fi
chmod 600 .env

if [ -z "$(get_env ADMIN_TOKEN)" ]; then
  if has openssl; then token=$(openssl rand -hex 24)
  elif has node; then token=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  else token=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'); fi
  set_env ADMIN_TOKEN "$token"
  ok "Generated an admin token (saved in .env)"
fi

domain="${DOMAIN_ARG:-$(get_env DOMAIN)}"
if [ -z "$DOMAIN_ARG" ] && [ -z "$domain" ] && [ "$ASSUME_YES" = 0 ] && [ -t 0 ]; then
  printf '\n  Public domain for HTTPS (e.g. cards.example.com).\n  Leave empty to run on this computer only: '
  read -r domain
fi
domain="$(printf '%s' "$domain" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]' | sed -E 's#^https?://##; s#/.*$##')"
if [ -n "$domain" ] && ! printf '%s' "$domain" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$'; then
  fail "\"$domain\" doesn't look like a domain name"
fi
set_env DOMAIN "$domain"

# ---- 2. Docker or Node ----
if [ -z "$MODE" ]; then
  if has docker && docker compose version >/dev/null 2>&1; then MODE=docker
  elif has node; then MODE=node
  else fail "Install Docker (https://docs.docker.com/get-docker/) or Node.js 22+ (https://nodejs.org), then run this again."; fi
fi

if [ "$MODE" = node ] && [ -n "$domain" ]; then
  echo "  Note: automatic HTTPS needs Docker. With Node, put your own HTTPS proxy in front."
fi

# ---- 3. Start ----
echo
if [ "$MODE" = docker ]; then
  has docker && docker compose version >/dev/null 2>&1 || fail "Docker with the compose plugin is required"
  docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker, then run this again."
  profile=""
  [ -n "$domain" ] && profile="--profile https"
  bold "Starting with Docker…"
  docker compose $profile up -d $BUILD
  printf '  Waiting for Heartfelt to be ready'
  for _ in $(seq 60); do
    if [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q heartfelt)" 2>/dev/null)" = healthy ]; then ready=1; break; fi
    printf '.'; sleep 1
  done
  echo
  [ "${ready:-0}" = 1 ] || fail "It didn't become healthy. See: docker compose logs heartfelt"
  ok "Heartfelt is running"
else
  has node || fail "Node.js 22+ is required: https://nodejs.org"
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 22 ] || fail "Node.js 22 or newer is required (you have $(node -v))"
  bold "Installing…"
  npm ci --omit=dev --no-audit --no-fund --loglevel=error
  ok "Installed"
fi

echo
if [ -n "$domain" ] && [ "$MODE" = docker ]; then
  bold "Open https://$domain"
  echo "  Make sure $domain points to this server (DNS A/AAAA record) and ports 80 and 443 are open."
  echo "  The certificate is issued on the first visit and renews by itself."
else
  bold "Open http://localhost:3000"
fi
echo "  Your admin token is in .env (keep it private)."

if [ "$MODE" = docker ]; then
  echo
  echo "  Logs:    docker compose logs -f"
  echo "  Stop:    docker compose ${profile:+$profile }down"
  echo "  Update:  git pull && ./setup.sh"
else
  echo "  Stop with Ctrl+C. Update with: git pull && ./setup.sh --node"
  echo
  exec npm start
fi
