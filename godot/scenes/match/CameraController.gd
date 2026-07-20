class_name CameraController extends Camera2D
# Pure renderer — camera framing only, no game logic. Auto-pan fires only on
# the LOCAL player's turn start, never on opponent turns (Decision 025 — the
# camera never follows opponent moves, which would leak fog/position info).

const MIN_VISIBLE_TILES := 5.0
const BOARD_PADDING := 1.1
const PAN_DURATION := 0.45
const DOUBLE_TAP_DURATION := 0.35
const DOUBLE_TAP_WINDOW := 0.3

var min_zoom: float = 0.2
var max_zoom: float = 5.0

var _pan_target: Vector2 = Vector2.ZERO
var _pan_tween: Tween
var _zoom_tween: Tween
var _last_tap_time: float = -1.0
var _zoom_cycle_index: int = 0
# Guards the one-time fit-to-screen setup. state_initialized fires before tiles
# arrive (first sync has 0 tiles), so we defer until we have real tile data.
var _initial_camera_set := false

func _ready() -> void:
    GameState.turn_changed.connect(_on_turn_changed)
    GameState.state_initialized.connect(_on_state_initialized)

func _recompute_zoom_bounds() -> void:
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    if board_rows == 0:
        return
    var viewport_size := get_viewport().get_visible_rect().size
    if viewport_size.x <= 0 or viewport_size.y <= 0:
        return
    var tile_px := float(BoardCoord.TILE_PX)
    var full_board_px := board_rows * tile_px * BOARD_PADDING
    var close_px := MIN_VISIBLE_TILES * tile_px
    # max_zoom: most zoomed OUT (whole board fits); min_zoom: most zoomed IN (~5 tiles wide).
    # Camera2D.zoom > 1 = magnified; use min() of x/y so the limiting dimension fits.
    max_zoom = min(viewport_size.x / full_board_px, viewport_size.y / full_board_px)
    min_zoom = min(viewport_size.x / close_px, viewport_size.y / close_px)

## Called when state_initialized fires (may be before tiles arrive) AND on every
## turn_changed. Sets zoom/position exactly once, when tiles are actually present.
func _try_set_initial_camera() -> void:
    if _initial_camera_set:
        return
    _recompute_zoom_bounds()
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    if board_rows < 7:
        return  # partial state (min valid board is 7×7); retry on next turn_changed
    _initial_camera_set = true
    zoom = Vector2(max_zoom, max_zoom)
    var half := (board_rows - 1) * float(BoardCoord.TILE_PX) * 0.5
    position = Vector2(half, half)

func _on_state_initialized() -> void:
    _try_set_initial_camera()

func _on_turn_changed() -> void:
    _try_set_initial_camera()
    if GameState.current_player_id != NetworkManager.local_player_id:
        return
    _pan_target = _compute_own_units_centroid()
    _tween_pan()

func _compute_own_units_centroid() -> Vector2:
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    var total := Vector2.ZERO
    var count := 0
    for id in GameState.explorers.keys():
        var e: Dictionary = GameState.explorers[id]
        if e.get("playerId", "") == NetworkManager.local_player_id:
            var coord := Vector2i(int(e.get("x", 0)), int(e.get("y", 0)))
            total += BoardCoord.to_world_position(coord, board_rows)
            count += 1
    return total / count if count > 0 else Vector2.ZERO

func _clamp_to_board(target: Vector2) -> Vector2:
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    if board_rows == 0:
        return target
    var board_size := (board_rows - 1) * float(BoardCoord.TILE_PX)
    var viewport_size := get_viewport().get_visible_rect().size
    var half_view := viewport_size * 0.5 / zoom.x
    # When the board is smaller than the viewport, center it instead of clamping.
    var cx: float
    var cy: float
    if half_view.x >= board_size * 0.5:
        cx = board_size * 0.5
    else:
        cx = clamp(target.x, half_view.x, board_size - half_view.x)
    if half_view.y >= board_size * 0.5:
        cy = board_size * 0.5
    else:
        cy = clamp(target.y, half_view.y, board_size - half_view.y)
    return Vector2(cx, cy)

func _tween_pan() -> void:
    _pan_target = _clamp_to_board(_pan_target)
    if _pan_tween:
        _pan_tween.kill()
    _pan_tween = create_tween()
    _pan_tween.tween_property(self, "position", _pan_target, PAN_DURATION) \
        .set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

## Decision 025 zoom formula (ortho_size -= delta*0.5*ortho_size), adapted to
## Godot's zoom property. max_zoom < min_zoom numerically (max_zoom = widest view).
func apply_pinch_delta(delta: float) -> void:
    _recompute_zoom_bounds()
    var new_zoom: float = zoom.x - delta * 0.5 * zoom.x
    new_zoom = clamp(new_zoom, max_zoom, min_zoom)
    zoom = Vector2(new_zoom, new_zoom)

func _input(event: InputEvent) -> void:
    if event is InputEventMagnifyGesture:
        apply_pinch_delta(event.factor - 1.0)
    elif event is InputEventScreenTouch and event.pressed:
        _handle_tap_for_double_tap()

func _handle_tap_for_double_tap() -> void:
    var now := Time.get_ticks_msec() / 1000.0
    if _last_tap_time >= 0.0 and now - _last_tap_time <= DOUBLE_TAP_WINDOW:
        _cycle_zoom()
        _last_tap_time = -1.0
    else:
        _last_tap_time = now

## 3-level cycle: FitToScreen (max_zoom, whole board) → Default (geometric
## mean) → Close (min_zoom, ~5x5 tiles) → back to FitToScreen.
func _cycle_zoom() -> void:
    _recompute_zoom_bounds()
    var targets: Array = [max_zoom, sqrt(min_zoom * max_zoom), min_zoom]
    _zoom_cycle_index = (_zoom_cycle_index + 1) % targets.size()
    var target_zoom: float = targets[_zoom_cycle_index]
    if _zoom_tween:
        _zoom_tween.kill()
    _zoom_tween = create_tween()
    _zoom_tween.tween_property(self, "zoom", Vector2(target_zoom, target_zoom), DOUBLE_TAP_DURATION) \
        .set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
