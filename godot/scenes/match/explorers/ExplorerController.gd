class_name ExplorerController extends Node2D
# Pure renderer for a single explorer — no game logic (Decision 008/047).
# Gray-box: one procedurally-generated flat-color square, no art files
# (Decision 058). Per-player team-color rendering is deferred, not this task.

const TWEEN_DURATION := 0.2
const SPRITE_COLOR := Color(0.85, 0.85, 0.90)

@onready var sprite: Sprite2D = $Sprite2D
@onready var label: Label = $Label
@onready var bot_badge: Label = $BotBadge

var explorer_id: String = ""
var target_coord: Vector2i = Vector2i.ZERO
var _board_rows: int = 0
var _flipped: bool = false
var _tween: Tween

func _ready() -> void:
    _build_sprite()

func _build_sprite() -> void:
    var px := BoardCoord.TILE_PX
    var image := Image.create_empty(px, px, false, Image.FORMAT_RGBA8)
    image.fill(SPRITE_COLOR)
    sprite.texture = ImageTexture.create_from_image(image)

## First spawn: set label/badge, snap position (no tween). `flipped` is the
## per-player view orientation (Decision 098) — this node's own transform is
## never rotated, only its computed `position` differs, so the Label child
## always renders upright regardless of flipped.
func setup(id: String, explorer_data: Dictionary, board_rows: int, flipped: bool = false) -> void:
    explorer_id = id
    _board_rows = board_rows
    _flipped = flipped
    label.text = str(explorer_data.get("explorerId", id))
    bot_badge.visible = explorer_data.get("isBot", false)
    _set_target(explorer_data)
    position = BoardCoord.to_world_position(target_coord, _board_rows, _flipped)

## Subsequent updates: update badge, tween to the new position.
func update_from_state(explorer_data: Dictionary, board_rows: int, flipped: bool = false) -> void:
    _board_rows = board_rows
    _flipped = flipped
    bot_badge.visible = explorer_data.get("isBot", false)
    _set_target(explorer_data)
    _tween_to_target()

func _set_target(explorer_data: Dictionary) -> void:
    target_coord = Vector2i(int(explorer_data.get("x", 0)), int(explorer_data.get("y", 0)))

func _tween_to_target() -> void:
    if _tween:
        _tween.kill()
    _tween = create_tween()
    _tween.tween_property(self, "position", BoardCoord.to_world_position(target_coord, _board_rows, _flipped), TWEEN_DURATION)
