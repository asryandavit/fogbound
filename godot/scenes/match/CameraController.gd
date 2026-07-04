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

func _ready() -> void:
    GameState.turn_changed.connect(_on_turn_changed)
    _recompute_zoom_bounds()

func _recompute_zoom_bounds() -> void:
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    if board_rows == 0:
        return
    var viewport_size := get_viewport().get_visible_rect().size
    if viewport_size.x <= 0 or viewport_size.y <= 0:
        return
    var tile_px := float(BoardCoord.TILE_PX)
    var full_board_px := Vector2(board_rows, board_rows) * tile_px * BOARD_PADDING
    max_zoom = max(full_board_px.x / viewport_size.x, full_board_px.y / viewport_size.y)
    var close_px := Vector2(MIN_VISIBLE_TILES, MIN_VISIBLE_TILES) * tile_px
    min_zoom = max(close_px.x / viewport_size.x, close_px.y / viewport_size.y)

func _on_turn_changed() -> void:
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

func _tween_pan() -> void:
    if _pan_tween:
        _pan_tween.kill()
    _pan_tween = create_tween()
    _pan_tween.tween_property(self, "position", _pan_target, PAN_DURATION) \
        .set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

## Decision 025 zoom formula (ortho_size -= delta*0.5*ortho_size), adapted to
## Godot's zoom property — smaller zoom.x is more magnified, same direction
## as Unity's orthoSize, so the formula carries over unchanged.
func apply_pinch_delta(delta: float) -> void:
    # Recompute fresh rather than trusting whatever _ready() cached — the
    # same GameState.tiles ordering hazard as Decision 061 applies here:
    # _ready() can run before tiles are fully populated, producing an
    # inverted/wrong min_zoom > max_zoom (confirmed live against
    # fogbound_backend). _recompute_zoom_bounds() is a safe no-op while
    # tiles is still empty (board_rows == 0 guard), so tests that set
    # min_zoom/max_zoom directly on an empty GameState are unaffected.
    _recompute_zoom_bounds()
    var new_zoom: float = zoom.x - delta * 0.5 * zoom.x
    new_zoom = clamp(new_zoom, min_zoom, max_zoom)
    zoom = Vector2(new_zoom, new_zoom)

func _input(event: InputEvent) -> void:
    if event is InputEventMagnifyGesture:
        # factor is a relative scale (1.0 = no change); approximated as a
        # delta for the Decision 025 formula. Not empirically verified against
        # real multitouch hardware — no automated test covers this path.
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
