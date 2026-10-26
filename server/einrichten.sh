#!/usr/bin/env bash
# ------------------------------------------------------------------
# Richtet einen frischen Hetzner-Server (Ubuntu 24.04) für mmint23.de ein. Einmal als root ausführen:
#
#   bash einrichten.sh "ssh-ed25519 AAAA… github-deploy"
#
# Das Argument ist der ÖFFENTLICHE Schlüssel, mit dem GitHub Actions die Website hochlädt (deploy_key.pub).
# Das Skript kann gefahrlos erneut ausgeführt werden, z. B. mit einem neuen Schlüssel.
#
# Was es tut:
#   - Sicherheitsupdates automatisch einspielen (unattended-upgrades)
#   - Firewall: nur SSH (22), HTTP (80) und HTTPS (443)
#   - Caddy als Webserver mit automatischem HTTPS-Zertifikat (Let's Encrypt), keine Zugriffsprotokolle
#   - Benutzer "deploy", der per rsync NUR in /var/www/mmint23.de schreiben darf (rrsync)
# ------------------------------------------------------------------
set -euo pipefail

DOMAIN="${DOMAIN:-mmint23.de}"
ORDNER="/var/www/$DOMAIN"
SCHLUESSEL="${1:-}"

if [[ $EUID -ne 0 ]]; then echo "Bitte als root ausführen." >&2; exit 1; fi
if [[ ! "$SCHLUESSEL" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+ ]]; then
  echo "Bitte den öffentlichen Deploy-Schlüssel als Argument angeben (Inhalt von deploy_key.pub)." >&2
  exit 1
fi

echo "== Pakete"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -y -q
apt-get install -y -q curl gpg rsync ufw unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https

echo "== Automatische Sicherheitsupdates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "== Caddy (offizielle Paketquelle)"
if [[ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]]; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
fi
apt-get install -y -q caddy

echo "== Benutzer deploy"
id deploy &>/dev/null || adduser --disabled-password --gecos "" deploy
install -d -o deploy -g deploy -m 755 "$ORDNER"
[[ -f "$ORDNER/index.html" ]] || {
  echo '<!doctype html><meta charset="utf-8"><title>mmint23</title><p>Die Website wird gerade eingerichtet.</p>' > "$ORDNER/index.html"
  chown deploy:deploy "$ORDNER/index.html"
}
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
# restrict: keine Shell, keine Weiterleitungen; rrsync: rsync nur innerhalb von $ORDNER
echo "command=\"/usr/bin/rrsync $ORDNER\",restrict $SCHLUESSEL" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

echo "== Caddy-Konfiguration"
cat > /etc/caddy/Caddyfile <<EOF
# Verwaltet von einrichten.sh – Änderungen dort vornehmen.
# Ohne "log"-Anweisung schreibt Caddy keine Zugriffsprotokolle (Datenschutz).

$DOMAIN {
	root * $ORDNER
	encode zstd gzip
	file_server
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
	@html path *.html */
	header @html Cache-Control "no-cache"
}

www.$DOMAIN {
	redir https://$DOMAIN{uri} permanent
}
EOF
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy
systemctl reload-or-restart caddy

echo "== Firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo
echo "Fertig. Prüfen: https://$DOMAIN (das HTTPS-Zertifikat kommt beim ersten Aufruf, sobald DNS stimmt)."
echo "Für GitHub (Secret DEPLOY_KNOWN_HOSTS) auf dem Laptop ausführen:  ssh-keyscan $DOMAIN"
