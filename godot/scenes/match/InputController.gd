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
    on_tap(BoardCoord.from_world_position(world_pos, board_rows))

## Core input logic — directly tested, independent of real touch/screen conversion.
func on_tap(coord: Vector2i) -> void:
    if GameState.current_player_id != NetworkManager.local_player_id:
        return

    if _selected_explorer_id.is_empty():
        var tapped_id := _find_own_explorer_at(coord)
        if tapped_id != "":
            _selected_explorer_id = tapped_id
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
