extends Node
# Config — autoload singleton. Holds environment settings and server URLs.
# SECURITY: this file must never contain secrets, API keys, tokens, or passwords.
# It holds only public, non-sensitive endpoints. One place for all URLs — no
# hardcoded endpoints anywhere else in the codebase (Client Security Rule).

# SECURITY: production MUST use wss:// (encrypted WebSocket) and https://.
# ws:// / http:// are only acceptable for local development (desktop localhost
# or an Android emulator talking to the host machine) — never in production.
const _WS_LOCAL     := "ws://localhost:4567"
const _WS_EMULATOR  := "ws://10.0.2.2:4567"  # emulator's alias for the host machine
const _WS_PROD      := "wss://api.fogbound.game:4567"  # placeholder — set real domain before release

const _API_LOCAL    := "http://localhost:4007"
const _API_EMULATOR := "http://10.0.2.2:4007"
const _API_PROD     := "https://api.fogbound.game:4007"  # placeholder — set real domain before release

## Target selection, local dev only ("emulator" vs unset/anything-else = local).
## Desktop/editor: set FOGBOUND_ENV in the OS environment.
## Android export: OS.get_environment() is NOT set for an installed APK (no
## shell env is inherited), so the "emulator" target is instead baked in per
## export preset via a custom feature tag (Project > Export > preset >
## Features tab > Custom: "fogbound_emulator"), read back with OS.has_feature().
## "production" is env-var-only — never baked into a feature tag.
func _target() -> String:
	if OS.has_feature("fogbound_emulator"):
		return "emulator"
	return OS.get_environment("FOGBOUND_ENV")

var server_url: String:
	get:
		match _target():
			"production": return _WS_PROD
			"emulator":   return _WS_EMULATOR
			_:            return _WS_LOCAL

## NestJS HTTP endpoint. Not yet consumed by any client code (auth/HTTP calls
## are not wired up on the client — see network_manager.gd's AUTH SEAM), but
## lives here now so no future caller ever hardcodes this endpoint elsewhere.
var api_url: String:
	get:
		match _target():
			"production": return _API_PROD
			"emulator":   return _API_EMULATOR
			_:            return _API_LOCAL
