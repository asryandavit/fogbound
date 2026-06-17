extends Node
# Config — autoload singleton. Holds environment settings and server URL.
# SECURITY: this file must never contain secrets, API keys, tokens, or passwords.
# It holds only public, non-sensitive endpoints. One place for all URLs — no
# hardcoded endpoints anywhere else in the codebase (Client Security Rule).

# SECURITY: production MUST use wss:// (encrypted WebSocket) and https://.
# ws:// is only acceptable for local development (localhost).
# Set FOGBOUND_ENV=production in the OS/export environment to activate the prod URL.
const _URL_LOCAL := "ws://localhost:4567"
const _URL_PROD  := "wss://api.fogbound.game:4567"  # placeholder — set real domain before release

var server_url: String:
	get:
		if OS.get_environment("FOGBOUND_ENV") == "production":
			return _URL_PROD
		return _URL_LOCAL
