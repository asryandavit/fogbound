class_name BoardLayer extends TileMapLayer
# Pure renderer — paints revealed tiles from GameState.tiles. No game logic
# (Decision 008/047). Gray-box: swatches are procedurally generated flat
# colors, no art files (Decision 058).

# Atlas layout: terrain kinds first, then treasure overlays.
const TERRAIN_TYPES := ["grass", "water"]
const TREASURE_TYPES := ["coin", "shield", "sword"]
const SWATCH_COLORS := [
    Color(0.30, 0.55, 0.25), # grass
    Color(0.20, 0.45, 0.75), # water
    Color(0.90, 0.80, 0.10), # coin
    Color(0.55, 0.55, 0.60), # shield
    Color(0.75, 0.20, 0.20), # sword
]

var _board_rows: int = 0

func _ready() -> void:
    _build_tileset()
    GameState.state_initialized.connect(_on_state_initialized)
    GameState.tile_changed.connect(_on_tile_changed)

func _build_tileset() -> void:
    var px := BoardCoord.TILE_PX
    var count := SWATCH_COLORS.size()
    var image := Image.create_empty(px * count, px, false, Image.FORMAT_RGBA8)
    for i in count:
        image.fill_rect(Rect2i(i * px, 0, px, px), SWATCH_COLORS[i])
    var texture := ImageTexture.create_from_image(image)

    var atlas := TileSetAtlasSource.new()
    atlas.texture = texture
    atlas.texture_region_size = Vector2i(px, px)
    for i in count:
        atlas.create_tile(Vector2i(i, 0))

    var ts := TileSet.new()
    ts.tile_size = Vector2i(px, px)
    ts.add_source(atlas, 0)
    tile_set = ts

func _on_state_initialized() -> void:
    _board_rows = BoardCoord.compute_board_rows(GameState.tiles)
    for tile_data in GameState.tiles.values():
        _paint_tile(tile_data)

func _on_tile_changed(coord_key: String) -> void:
    if _board_rows == 0:
        _board_rows = BoardCoord.compute_board_rows(GameState.tiles)
    if GameState.tiles.has(coord_key):
        _paint_tile(GameState.tiles[coord_key])

func _paint_tile(tile_data: Dictionary) -> void:
    if not tile_data.get("isRevealed", false):
        return
    var coord := BoardCoord.to_tilemap_coord(tile_data, _board_rows)
    set_cell(coord, 0, Vector2i(_pick_atlas_index(tile_data), 0))

func _pick_atlas_index(tile_data: Dictionary) -> int:
    var treasure: String = tile_data.get("treasureType", "none")
    if treasure != "none" and treasure != "":
        var t_idx := TREASURE_TYPES.find(treasure)
        if t_idx != -1:
            return TERRAIN_TYPES.size() + t_idx
    var terrain: String = tile_data.get("tileType", "grass")
    var g_idx := TERRAIN_TYPES.find(terrain)
    return g_idx if g_idx != -1 else 0
