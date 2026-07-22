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
signal move_sent

# ─── Connection state machine ─────────────────────────────────────────────────
enum State { DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, ERROR }

var current_state: State = State.DISCONNECTED

## The playerId this client claimed during join — the server uses it verbatim
## for player.playerId, explorer.playerId, and turnState.currentPlayerId
## (backend/src/colyseus/rooms/GameRoom.ts: options.playerId || client.sessionId).
var local_player_id: String = ""

# Untyped: Colyseus.* are inner classes; type annotations fail at parse time
# before the GDExtension populates the class registry (spike confirmed this).
var _client = null  # Colyseus.Client
var _room   = null  # Colyseus.Room

# ─── Public API ───────────────────────────────────────────────────────────────

## Connect to fogbound_room on the configured server. Safe to call once per match.
## options: extra join options (e.g. { "matchId": "..." }). Do not pass tokens here
## yet — see the AUTH SEAM comment below.
func connect_to_match(options: Dictionary = {}) -> void:
	if current_state == State.CONNECTING or current_state == State.CONNECTED:
		push_warning("NetworkManager: already connecting or connected — ignoring call")
		return

	_set_state(State.CONNECTING)

	# Fresh slate. GameState is an autoload that outlives the Match scene, so a
	# "Play Again" or a brand-new match would otherwise inherit the previous
	# match's tiles/explorers/players/turn. Called DIRECTLY here, not via a
	# StateMapper static helper: routing reset through StateMapper.reset_state()
	# was observed to silently no-op in this Godot build (the static method's
	# body never executed, though sibling statics like apply_player_change run
	# fine), while this direct call from the NetworkManager Node context clears
	# reliably. Confirmed live — see Decision on the game-flow layer.
	GameState.reset()

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
	join_opts.merge(options, true)  # caller options (incl. vsBot) override defaults
	local_player_id = join_opts["playerId"]

	# "vs Bot" must get a guaranteed-fresh room (create) so matchmaking can
	# never drop us into another human's game; "vs Player" uses join_or_create
	# to be matched with a second human. The server reads join_opts.vsBot to
	# decide whether to spawn a bot opponent and lock the room (GameRoom.onJoin).
	var vs_bot: bool = bool(join_opts.get("vsBot", false))
	if vs_bot:
		_room = _client.create("fogbound_room", join_opts)
	else:
		_room = _client.join_or_create("fogbound_room", join_opts)
	if not _room:
		push_error("NetworkManager: room creation returned null — GDExtension not loaded")
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
	move_sent.emit()

## Send an end-turn request to the server (backend/src/colyseus/rooms/GameRoom.ts:
## onMessage('end_turn', ...) — no payload; the server identifies the player by
## client session). REQUEST only — the server advances turnState, never the client.
func send_end_turn() -> void:
	if not _room or not _room.connected:
		push_warning("NetworkManager: send_end_turn called while not connected — ignoring")
		return
	_room.send_message("end_turn", {})

## Cleanly leave the current room. Tears down our signal handlers FIRST so a
## lingering room can never call back into GameState after we've moved on —
## live testing showed an old room merging its players into the next match
## when only _room was nulled (its state_changed stayed connected).
func disconnect_from_match() -> void:
	if _room:
		_disconnect_room_signals(_room)
		if _room.connected:
			_room.leave()
	_room = null
	_client = null  # drop the old Client so it (and its room/socket) can free
	_ready_sent = false
	_set_state(State.DISCONNECTED)

## Disconnect every handler we attached in connect_to_match. Guarded by
## is_connected so a partially-set-up or already-torn-down room is safe.
func _disconnect_room_signals(room) -> void:
	var handlers := {
		"joined": _on_joined,
		"error": _on_error,
		"left": _on_left,
		"dropped": _on_dropped,
		"reconnected": _on_reconnected,
		"message_received": _on_message_received,
		"state_changed": _on_state_changed,
	}
	for sig_name in handlers:
		if room.is_connected(sig_name, handlers[sig_name]):
			room.disconnect(sig_name, handlers[sig_name])

## True while a room connection is live.
var is_connected: bool:
	get: return current_state == State.CONNECTED

# Sent once per match after the initial state sync completes, so the server
# knows this client has loaded and the bot-takeover timer can arm safely.
var _ready_sent: bool = false

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
	# Route the authoritative match-over event into GameState via StateMapper
	# (the only other file allowed to read raw server shapes) so views react
	# through GameState.match_ended, not a raw transport message (Decision 048).
	if type_str == "match_ended":
		StateMapper.apply_match_ended(data_dict)
	server_message.emit(type_str, data_dict)

# ─── Private: state observation ───────────────────────────────────────────────

func _on_state_changed() -> void:
	# Reliable baseline: fires on every server delta (confirmed live across
	# every task this project has built). This is now the ONLY state
	# observation mechanism — see _setup_state_callbacks for why.
	if _room == null:
		return  # a late delta from a room we just left (disconnect nulls _room)
	var state = _room.get_state()
	if state != null:
		_log_state_counts(state)
		_sync_all_from_state(state)

func _setup_state_callbacks() -> void:
	# EMPIRICAL FINDING (see docs/DECISIONS.md — supersedes the
	# Colyseus.Callbacks-based design from GC2/Decision 060/063): per-field
	# listen() registered on a MapSchema collection item (tiles/explorers/
	# players, obtained via on_add) never fires again after the initial
	# registration in this SDK build (0.17.11) — confirmed live in a real
	# multi-move bot match where explorer x/y listen callbacks fired ZERO
	# times across ~10 real server-side moves, even though the server was
	# provably moving them (confirmed via backend-side logging). This
	# invalidates the earlier belief that collection items "stay reliably
	# readable" — they may be readable, but their field-level listen()
	# doesn't fire at all, a different and more basic problem than turnState's
	# stale-reread issue.
	#
	# room.state_changed, however, IS confirmed reliable — it has fired
	# correctly on every real delta throughout this project (originally just
	# for _log_state_counts). So: drop the whole Callbacks/on_add/listen
	# apparatus for tiles/explorers/players/turnState, and instead re-sync
	# everything from a fresh state.get(...) read every time state_changed
	# fires. Cheap given board sizes top out at 289 tiles and a handful of
	# explorers/players.
	var state = _room.get_state()
	if state == null:
		push_warning("NetworkManager: get_state() null after join")
		return

	print("[NetworkManager] initial state type=%s" % type_string(typeof(state)))
	_log_state_counts(state)
	_sync_all_from_state(state)

## Re-derives GameState from a full state snapshot. Called on the initial
## post-join state and on every subsequent state_changed event. StateMapper
## re-validates and translates each item fresh every time (Decision 043) —
## no raw SDK data is cached across calls.
func _sync_all_from_state(state) -> void:
	var tiles = state.get("tiles")
	if tiles is Dictionary:
		for key in tiles.keys():
			StateMapper.apply_tile_change(key, tiles[key])

	var explorers = state.get("explorers")
	if explorers is Dictionary:
		for existing_id in GameState.explorers.keys():
			if not explorers.has(existing_id):
				StateMapper.remove_explorer(existing_id)
		for key in explorers.keys():
			StateMapper.apply_explorer_change(key, explorers[key])

	var players = state.get("players")
	if players is Dictionary:
		for key in players.keys():
			StateMapper.apply_player_change(key, players[key])

	var turn_state = state.get("turnState")
	if turn_state != null:
		StateMapper.apply_turn_change(turn_state)

	if not GameState.is_initialized:
		StateMapper.finalize_initialization()
		_send_player_ready()

# ─── Private: helpers ─────────────────────────────────────────────────────────

func _log_state_counts(state) -> void:
	# SECURITY: log structural counts only — no field values or player data
	var tiles_n     := _collection_size(state, "tiles")
	var explorers_n := _collection_size(state, "explorers")
	var players_n   := _collection_size(state, "players")
	print("[NetworkManager] state decoded — tiles:%d explorers:%d players:%d" % [
		tiles_n, explorers_n, players_n
	])

func _send_player_ready() -> void:
	if _ready_sent or not _room:
		return
	_ready_sent = true
	_room.send_message("player_ready", {})

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
