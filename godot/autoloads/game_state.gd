extends Node
# GameState — autoload singleton. Pure state store + change signals.
# No Colyseus import (Decision 043) — the only writer is state_mapper.gd.
# View nodes subscribe to these signals only, never to SDK events directly
# (Decision 048).

# ─── Signals (Decision 048 — game-truth layer) ────────────────────────────────
signal state_initialized
signal tile_changed(coord: String)
signal explorer_added(id: String)
signal explorer_moved(id: String)
signal explorer_removed(id: String)
signal player_changed(id: String)
signal turn_changed
signal match_ended(winner_id: String)

# ─── State ─────────────────────────────────────────────────────────────────────
var tiles: Dictionary = {}
var explorers: Dictionary = {}
var players: Dictionary = {}
var current_player_id: String = ""
var turn_number: int = 0
var phase: String = ""
var is_initialized: bool = false

# ─── Setters (called only by state_mapper.gd) ─────────────────────────────────

func set_tile(coord_key: String, tile_data: Dictionary) -> void:
    tiles[coord_key] = tile_data
    tile_changed.emit(coord_key)

func set_explorer(explorer_id: String, explorer_data: Dictionary) -> void:
    var is_new := not explorers.has(explorer_id)
    explorers[explorer_id] = explorer_data
    if is_new:
        explorer_added.emit(explorer_id)
    else:
        explorer_moved.emit(explorer_id)

func remove_explorer(explorer_id: String) -> void:
    if explorers.has(explorer_id):
        explorers.erase(explorer_id)
        explorer_removed.emit(explorer_id)

func set_player(player_id: String, player_data: Dictionary) -> void:
    players[player_id] = player_data
    player_changed.emit(player_id)

func set_turn_state(player_id: String, number: int, turn_phase: String) -> void:
    current_player_id = player_id
    turn_number = number
    phase = turn_phase
    turn_changed.emit()

func mark_initialized() -> void:
    if is_initialized:
        return
    is_initialized = true
    state_initialized.emit()

func end_match(winner_id: String) -> void:
    match_ended.emit(winner_id)

## Clears all state back to a fresh, pre-match condition. Called directly by
## network_manager.connect_to_match at the start of every new connection so a
## "Play Again" / new match never inherits the previous match's tiles,
## explorers, players, or turn — this is an autoload, so it persists across
## scene changes and would otherwise carry stale data into the next match.
## (Called directly rather than via a StateMapper helper because a static
## StateMapper method routing here was observed to no-op in this Godot build.)
## Emits no signals: it runs between matches while the old Match scene has
## been freed and the new one hasn't yet subscribed.
func reset() -> void:
    tiles.clear()
    explorers.clear()
    players.clear()
    current_player_id = ""
    turn_number = 0
    phase = ""
    is_initialized = false
