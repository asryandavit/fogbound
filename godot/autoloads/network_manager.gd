extends Node
# NetworkManager — autoload singleton.
# ONLY file in the project that imports or calls Colyseus.* (Decision 043).
# SDK boundary rule: all SDK references are isolated here. No other file may
# touch Colyseus.*. When the SDK changes, only this file needs updating.
# SECURITY: never log tokens, player data content, or server internals — only
# structural info (counts, state names, IDs that are already public in the room).

# ─── Signals (Decision 048 — transport layer only) ────────────────────────────
signal connection_state_changed(new_state: String)
signal server_message(type: String, data: Dictionary)

# ─── Connection state machine ─────────────────────────────────────────────────
enum State { DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, ERROR }

var current_state: State = State.DISCONNECTED

## The playerId this client claimed during join — the server uses it verbatim
## for player.playerId, explorer.playerId, and turnState.currentPlayerId
## (backend/src/colyseus/rooms/GameRoom.ts: options.playerId || client.sessionId).
var local_player_id: String = ""

# Untyped: Colyseus.* are inner classes; type annotations fail at parse time
# before the GDExtension populates the class registry (spike confirmed this).
var _client    = null  # Colyseus.Client
var _room      = null  # Colyseus.Room
var _callbacks = null  # Colyseus.Callbacks — set after join, used in GC2+

# ─── Public API ───────────────────────────────────────────────────────────────

## Connect to fogbound_room on the configured server. Safe to call once per match.
## options: extra join options (e.g. { "matchId": "..." }). Do not pass tokens here
## yet — see the AUTH SEAM comment below.
func connect_to_match(options: Dictionary = {}) -> void:
	if current_state == State.CONNECTING or current_state == State.CONNECTED:
		push_warning("NetworkManager: already connecting or connected — ignoring call")
		return

	_set_state(State.CONNECTING)
	_client = Colyseus.Client.new(Config.server_url)

	# AUTH SEAM (Decision 046): when JWT auth is built, inject the token here
	# so it travels with the join handshake to Colyseus for server-side validation.
	# Example (do NOT enable until the auth sprint):
	#   var token := AuthService.get_token()
	#   _client.auth.set_token(token)
	#   options["token"] = token
	# For now: anonymous connection. Server assigns a playerId from sessionId.

	var join_opts := {
		"playerId": "player_%d" % Time.get_ticks_msec(),
		"username": "Player",
	}
	join_opts.merge(options, true)  # caller options override defaults
	local_player_id = join_opts["playerId"]

	_room = _client.join_or_create("fogbound_room", join_opts)
	if not _room:
		push_error("NetworkManager: join_or_create returned null — GDExtension not loaded")
		_set_state(State.ERROR)
		return

	_room.joined.connect(_on_joined)
	_room.error.connect(_on_error)
	_room.left.connect(_on_left)
	_room.dropped.connect(_on_dropped)
	_room.reconnected.connect(_on_reconnected)
	_room.message_received.connect(_on_message_received)
	_room.state_changed.connect(_on_state_changed)

## Send a move request to the server (Decision 039: client sends a REQUEST only;
## the server validates, applies, and broadcasts the resulting state delta).
## The client NEVER applies the move locally.
func send_move(explorer_id: String, target_x: int, target_y: int) -> void:
	if not _room or not _room.connected:
		push_warning("NetworkManager: send_move called while not connected — ignoring")
		return
	_room.send_message("move_explorer", {
		"explorerId": explorer_id,
		"targetX":    target_x,
		"targetY":    target_y,
	})

## Cleanly leave the current room.
func disconnect_from_match() -> void:
	if _room and _room.connected:
		_room.leave()
	_room      = null
	_callbacks = null
	_set_state(State.DISCONNECTED)

## True while a room connection is live.
var is_connected: bool:
	get: return current_state == State.CONNECTED

# ─── Private: state machine ───────────────────────────────────────────────────

func _set_state(new_state: State) -> void:
	current_state = new_state
	var label: String = State.keys()[new_state]
	# Structural log only — no user data
	print("[NetworkManager] → %s" % label)
	connection_state_changed.emit(label)

# ─── Private: room signal handlers ───────────────────────────────────────────

func _on_joined() -> void:
	print("[NetworkManager] joined room=%s session=%s" % [
		_room.get_id(), _room.get_session_id()
	])
	_set_state(State.CONNECTED)
	_setup_state_callbacks()

func _on_error(code: int, _message: String) -> void:
	# SECURITY: do not log _message — may contain server internals
	push_error("[NetworkManager] room error code=%d" % code)
	_set_state(State.ERROR)

func _on_left(code: int, _reason: String) -> void:
	print("[NetworkManager] left code=%d" % code)
	if current_state != State.RECONNECTING:
		_set_state(State.DISCONNECTED)

func _on_dropped(code: int, _reason: String) -> void:
	print("[NetworkManager] dropped code=%d — entering RECONNECTING" % code)
	_set_state(State.RECONNECTING)
	# SDK auto-reconnects with backoff; _on_reconnected fires on success.
	# To tune: _room.set_reconnection_options({"max_retries": 5, "min_delay_ms": 1000})

func _on_reconnected() -> void:
	print("[NetworkManager] reconnected room=%s" % _room.get_id())
	_set_state(State.CONNECTED)
	_setup_state_callbacks()  # re-register on fresh state (Decision 045)

func _on_message_received(type: Variant, data: Variant) -> void:
	var type_str := str(type)
	var data_dict: Dictionary = data if data is Dictionary else {}
	# SECURITY: log type only — never log data content (may contain player info)
	print("[NetworkManager] message type=%s" % type_str)
	server_message.emit(type_str, data_dict)

# ─── Private: state observation ───────────────────────────────────────────────

func _on_state_changed() -> void:
	# Reliable baseline: fires on every server delta.
	# GC2 will route this through state_mapper → game_state instead of logging.
	var state = _room.get_state()
	if state != null:
		_log_state_counts(state)

func _setup_state_callbacks() -> void:
	# Attempt to use Colyseus.Callbacks.of(room) for delta-driven observation.
	# This is the ⚠ flagged in GODOT_CLIENT.md — we test it empirically here.
	# The state_changed signal above is the confirmed-working fallback.
	var state = _room.get_state()
	if state == null:
		push_warning("NetworkManager: get_state() null after join")
		return

	print("[NetworkManager] initial state type=%s" % type_string(typeof(state)))
	_log_state_counts(state)

	# Colyseus.Callbacks.of(room): confirmed working with 0.17.11 (GC1+GC2 empirical tests).
	# CONFIRMED signatures (see docs/GODOT_CLIENT.md for full notes):
	#   on_add(state, "collection_key", func(item: Dictionary, key: String))
	#   on_remove(state, "collection_key", func(item: Dictionary, key: String))
	#   listen(item, "field_name", func(new_val, old_val))
	#   on_change(state, func() -> void: ...)  — zero args
	# INVALID: on_add(room, callback) — room is not a valid target; use state dict.
	# BROKEN (crashes native ext, Decision 060): on_change(state, "field", func(val, key))
	#   on a root-level Schema REF field — use listen(state, "field", ...) instead.
	# NOTE: state is empty at registration time; callbacks fire on the first server patch.
	# NOTE: on_add back-fills existing items when the first patch arrives.
	_callbacks = Colyseus.Callbacks.of(_room)
	if _callbacks == null:
		print("[NetworkManager] Callbacks.of() returned null — state_changed signal is fallback")
		return

	# GC2: route every callback through StateMapper — this file is the only one
	# allowed to touch Colyseus.* (Decision 043); StateMapper never imports it.
	#
	# EMPIRICAL CORRECTIONS vs docs/GODOT_CLIENT.md (found during GC2 live testing,
	# SDK 0.17.11 — see docs/DECISIONS.md entry 060):
	#   - on_change(state, "field_name", func(val, key)) CRASHES the native
	#     extension (misaligned-pointer panic in GodotCallbackEntry) when used on
	#     a root-level Schema REF field (e.g. turnState). Use listen(state,
	#     "field_name", func(new_val, old_val)) instead — same result, no crash.
	#   - on_change(state, func(...)) (the generic, no-key form) invokes its
	#     callback with ZERO arguments, not one. func(_changes) errors with
	#     "Method expected 1 argument(s), but called with 0."

	# Tiles: on_add back-fills existing tiles first, then fires for new additions.
	# Nested listen() is attached inside on_add — on_change does not cascade to
	# nested schema properties (Decision 044).
	_callbacks.on_add(state, "tiles", func(tile, coord_key: String) -> void:
		_callbacks.listen(tile, "isRevealed", func(_new_val, _old_val) -> void:
			StateMapper.apply_tile_change(coord_key, tile)
		)
		StateMapper.apply_tile_change(coord_key, tile)
	)

	# Explorers
	_callbacks.on_add(state, "explorers", func(explorer, id: String) -> void:
		_callbacks.listen(explorer, "x", func(_n, _o) -> void: StateMapper.apply_explorer_change(id, explorer))
		_callbacks.listen(explorer, "y", func(_n, _o) -> void: StateMapper.apply_explorer_change(id, explorer))
		StateMapper.apply_explorer_change(id, explorer)
	)
	_callbacks.on_remove(state, "explorers", func(_explorer, id: String) -> void:
		StateMapper.remove_explorer(id)
	)

	# Players
	_callbacks.on_add(state, "players", func(player, id: String) -> void:
		StateMapper.apply_player_change(id, player)
	)

	# Turn state (nested REF schema on root). listen(), not on_change("turnState", ...) —
	# see EMPIRICAL CORRECTIONS above.
	_callbacks.listen(state, "turnState", func(turn_state, _old_val) -> void:
		StateMapper.apply_turn_change(turn_state)
	)

	# Signal GameState that initial hydration is complete. Zero-arg callback —
	# see EMPIRICAL CORRECTIONS above.
	_callbacks.on_change(state, func() -> void:
		if not GameState.is_initialized:
			StateMapper.finalize_initialization()
	)

# ─── Private: helpers ─────────────────────────────────────────────────────────

func _log_state_counts(state) -> void:
	# SECURITY: log structural counts only — no field values or player data
	var tiles_n     := _collection_size(state, "tiles")
	var explorers_n := _collection_size(state, "explorers")
	var players_n   := _collection_size(state, "players")
	print("[NetworkManager] state decoded — tiles:%d explorers:%d players:%d" % [
		tiles_n, explorers_n, players_n
	])

func _collection_size(state, key: String) -> int:
	var col = null
	if state is Dictionary:
		col = state.get(key)
	elif state != null:
		col = state.get(key)  # Schema._get fallback
	if col == null:
		return 0
	if col is Dictionary or col is Array:
		return col.size()
	if col is Object and col.has_method(&"size"):
		return col.size()
	return 0
