class_name InputController extends Node
# Tap-to-select, tap-to-move. Request-only — never mutates GameState
# (Decision 039). All game rules and legality are server-side (CLAUDE.md
# Client Security Rules: "Client never trusts itself"); this only guards
# whose-turn-it-is as a UX nicety, since the server re-validates regardless.

## Swappable for tests (only send_move needs interception). Defaults to the
## real NetworkManager autoload.
var network_sender = null

var _selected_explorer_id: String = ""

func _ready() -> void:
    if network_sender == null:
        network_sender = NetworkManager

func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch and event.pressed:
        _handle_screen_tap(event.position)

func _handle_screen_tap(screen_pos: Vector2) -> void:
    var world_pos: Vector2 = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    # Per-player view orientation (Decision 098): a tap must invert through
    # the SAME flip the renderers used, or it lands on the wrong server tile
    # for the flipped player. Recomputed fresh — never cached.
    var local_base_y: int = GameState.players.get(NetworkManager.local_player_id, {}).get("baseY", 0)
    var flipped := BoardCoord.is_local_view_flipped(local_base_y)
    on_tap(BoardCoord.from_world_position(world_pos, board_rows, flipped))

## Core input logic — directly tested, independent of real touch/screen conversion.
func on_tap(coord: Vector2i) -> void:
    if GameState.current_player_id != NetworkManager.local_player_id:
        return

    if _selected_explorer_id.is_empty():
        var tapped_id := _find_own_explorer_at(coord)
        if tapped_id != "":
            _selected_explorer_id = tapped_id
        return

    # Guard: don't send a move to the explorer's current position — the server
    # would reject it (INVALID_MOVE) and the undo button would flash phantom.
    var e: Dictionary = GameState.explorers.get(_selected_explorer_id, {})
    if coord.x == int(e.get("x", -1)) and coord.y == int(e.get("y", -1)):
        _selected_explorer_id = ""
        return

    network_sender.send_move(_selected_explorer_id, coord.x, coord.y)
    _selected_explorer_id = ""

func _find_own_explorer_at(coord: Vector2i) -> String:
    for id in GameState.explorers.keys():
        var e: Dictionary = GameState.explorers[id]
        if e.get("playerId", "") == NetworkManager.local_player_id \
           and int(e.get("x", -1)) == coord.x and int(e.get("y", -1)) == coord.y:
            return id
    return ""
