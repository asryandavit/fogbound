class_name StateMapper extends RefCounted
# StateMapper — translates raw Colyseus data (Dictionary or Schema instance)
# into GameState updates. Only file, besides network_manager.gd, permitted to
# consume raw server data shapes (Decision 043). Never imports Colyseus.*.
# All functions are static: this is a pure translator with no instance state.
#
# Called fresh on every state_changed event (see network_manager.gd's
# _sync_all_from_state) — not from field-level listen() callbacks. Per-field
# listen() on MapSchema collection items was tried first and found to never
# fire again after initial registration in this SDK build (0.17.11); see
# docs/DECISIONS.md for the full empirical history.

## Reads a field from either a Dictionary or a Colyseus Schema Object uniformly.
## Both types expose a single-arg get(key) — Dictionary's two-arg get(key, default)
## is intentionally not used here so the call works identically on either source.
static func _field(source, key: String, default = null):
    if source == null:
        return default
    var value = source.get(key)
    return value if value != null else default

static func apply_tile_change(coord_key: String, tile_data) -> void:
    if tile_data == null or coord_key.is_empty():
        push_warning("StateMapper: apply_tile_change called with invalid data")
        return
    GameState.set_tile(coord_key, {
        "x":             _field(tile_data, "x", 0),
        "y":             _field(tile_data, "y", 0),
        "tileType":      _field(tile_data, "tileType", ""),
        "isRevealed":    _field(tile_data, "isRevealed", false),
        "treasureType":  _field(tile_data, "treasureType", ""),
        "treasureValue": _field(tile_data, "treasureValue", 0),
        "isOccupied":    _field(tile_data, "isOccupied", false),
    })

static func apply_explorer_change(explorer_id: String, explorer_data) -> void:
    if explorer_data == null or explorer_id.is_empty():
        push_warning("StateMapper: apply_explorer_change called with invalid data")
        return
    GameState.set_explorer(explorer_id, {
        "explorerId":   _field(explorer_data, "explorerId", explorer_id),
        "playerId":     _field(explorer_data, "playerId", ""),
        "x":            _field(explorer_data, "x", 0),
        "y":            _field(explorer_data, "y", 0),
        "state":        _field(explorer_data, "state", ""),
        "score":        _field(explorer_data, "score", 0),
        "coinCount":    _field(explorer_data, "coinCount", 0),
        "hasBag":       _field(explorer_data, "hasBag", false),
        "hasBoat":      _field(explorer_data, "hasBoat", false),
        "hasShield":    _field(explorer_data, "hasShield", false),
        "isBot":        _field(explorer_data, "isBot", false),
        "botMoveCount": _field(explorer_data, "botMoveCount", 0),
    })

static func remove_explorer(explorer_id: String) -> void:
    GameState.remove_explorer(explorer_id)

static func apply_player_change(player_id: String, player_data) -> void:
    if player_data == null or player_id.is_empty():
        push_warning("StateMapper: apply_player_change called with invalid data")
        return
    GameState.set_player(player_id, {
        "playerId":    _field(player_data, "playerId", player_id),
        "username":    _field(player_data, "username", ""),
        "score":       _field(player_data, "score", 0),
        "isBot":       _field(player_data, "isBot", false),
        "isConnected": _field(player_data, "isConnected", true),
        "slotNumber":  _field(player_data, "slotNumber", 0),
        "teamColor":   _field(player_data, "teamColor", ""),
        "baseX":       _field(player_data, "baseX", 0),
        "baseY":       _field(player_data, "baseY", 0),
    })

static func apply_turn_change(turn_data) -> void:
    if turn_data == null:
        push_warning("StateMapper: apply_turn_change called with invalid data")
        return
    GameState.set_turn_state(
        str(_field(turn_data, "currentPlayerId", "")),
        int(_field(turn_data, "turnNumber", 0)),
        str(_field(turn_data, "phase", ""))
    )

static func finalize_initialization() -> void:
    GameState.mark_initialized()
