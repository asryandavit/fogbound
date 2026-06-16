extends Node2D
## Step-6 spike: connect to fogbound_room, poll for state, report raw decode result.
##
## GDScript 4 constraints discovered during this spike:
##  - class_name Colyseus compiles cleanly when loaded standalone (pre-cached)
##  - "extends Colyseus.Schema" from an external script fails (inner-class limit)
##  - Colyseus.X type annotations in var decls fail if Colyseus isn't pre-cached;
##    use untyped vars and rely on runtime class registry instead.
##  - set_state_type() requires a class; tested without it first to see raw return.

const TIMEOUT_SECONDS := 10.0

# Untyped — type annotations resolved at parse time would fail before colyseus.gd
# is in the registry; Colyseus itself IS available at _ready() runtime.
var _client   = null
var _room     = null
var _elapsed        := 0.0
var _done           := false
var _joined         := false
var _state_received := false

func _ready() -> void:
	print("[SpikeTest] Connecting to ws://localhost:4567 ...")
	_client = Colyseus.Client.new("ws://localhost:4567")
	_room = _client.join_or_create("fogbound_room", {
		"playerId": "spike_test_player",
		"username": "SpikeBot",
	})
	if not _room:
		print("FAILED: join_or_create returned null — GDExtension not loaded")
		_quit_clean()
		return
	_room.joined.connect(_on_joined)
	_room.state_changed.connect(_on_state_changed)
	_room.error.connect(_on_error)
	_room.left.connect(_on_left)

func _process(delta: float) -> void:
	if _done:
		return
	Colyseus.poll()
	_elapsed += delta
	if _elapsed >= TIMEOUT_SECONDS:
		var what = "joined" if not _joined else "state_changed"
		print("FAILED: timeout after %.1fs — %s never fired" % [TIMEOUT_SECONDS, what])
		_quit_clean()

# ─── Room callbacks ────────────────────────────────────────────────────────

func _on_joined() -> void:
	_joined = true
	print("CONNECTED: room=%s session=%s" % [_room.get_id(), _room.get_session_id()])

func _on_state_changed() -> void:
	if _state_received:
		return
	_state_received = true

	var state = _room.get_state()
	print("STATE RECEIVED — GDScript type: %s" % type_string(typeof(state)))

	if state == null:
		print("FAILED: get_state() is null (set_state_type not called — expected for this raw test)")
		_quit_clean()
		return

	if state is Dictionary:
		_report_dict(state)
	elif state is Object:
		_report_object(state)
	else:
		print("  raw: ", state)

	print("SPIKE PASSED")
	_quit_clean()

func _report_dict(state: Dictionary) -> void:
	print("STATE DECODED (Dictionary):")
	print("  matchId:          ", state.get("matchId", "?"))
	print("  status:           ", state.get("status", "?"))
	print("  winCondition:     ", state.get("winCondition", "?"))
	print("  turnTimerSeconds: ", state.get("turnTimerSeconds", "?"))
	var players   = state.get("players")
	var tiles     = state.get("tiles")
	var explorers = state.get("explorers")
	print("  players count:    ", _size_str(players))
	print("  tiles count:      ", _size_str(tiles))
	print("  explorers count:  ", _size_str(explorers))
	var turn = state.get("turnState")
	if turn is Dictionary:
		print("  turnState.currentPlayerId: ", turn.get("currentPlayerId", "?"))
		print("  turnState.turnNumber:      ", turn.get("turnNumber", "?"))
		print("  turnState.phase:           ", turn.get("phase", "?"))
	else:
		print("  turnState: ", turn)

func _report_object(state: Object) -> void:
	print("STATE DECODED (Object — class: %s):" % state.get_class())
	for prop in ["matchId", "status", "winCondition", "turnTimerSeconds",
				 "players", "tiles", "explorers", "turnState"]:
		var val = state.get(prop)
		if val == null:
			print("  %s: null" % prop)
		elif val is Object:
			var sz = " size=%d" % val.size() if val.has_method("size") else ""
			print("  %s: [%s%s]" % [prop, val.get_class(), sz])
		else:
			print("  %s: %s" % [prop, str(val)])

func _size_str(v) -> String:
	if v == null:
		return "null"
	if v is Dictionary or v is Array:
		return str(v.size())
	if v is Object and v.has_method("size"):
		return str(v.size())
	return str(v)

func _on_error(code: int, message: String) -> void:
	print("FAILED: room error code=%d message=%s" % [code, message])
	_quit_clean()

func _on_left(code: int, _reason: String) -> void:
	if not _done and not _state_received:
		print("FAILED: room closed (code=%d) before state arrived" % code)
		_quit_clean()

func _quit_clean() -> void:
	if _done:
		return
	_done = true
	if _room and _room.connected:
		_room.leave()
	get_tree().quit()
