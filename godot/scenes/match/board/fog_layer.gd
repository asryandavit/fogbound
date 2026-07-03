class_name FogLayer extends TileMapLayer
# Pure renderer — fog is derived entirely from tile.isRevealed (Decision 047).
# Never computed client-side. Gray-box: one flat-color swatch, no art files.

const FOG_COLOR := Color(0.08, 0.08, 0.10)

var _board_rows: int = 0

func _ready() -> void:
    _build_tileset()
    GameState.state_initialized.connect(_on_state_initialized)
    GameState.tile_changed.connect(_on_tile_changed)

func _build_tileset() -> void:
    var px := BoardCoord.TILE_PX
    var image := Image.create_empty(px, px, false, Image.FORMAT_RGBA8)
    image.fill(FOG_COLOR)
    var texture := ImageTexture.create_from_image(image)

    var atlas := TileSetAtlasSource.new()
    atlas.texture = texture
    atlas.texture_region_size = Vector2i(px, px)
    atlas.create_tile(Vector2i(0, 0))

    var ts := TileSet.new()
    ts.tile_size = Vector2i(px, px)
    ts.add_source(atlas, 0)
    tile_set = ts

func _on_state_initialized() -> void:
    _board_rows = BoardCoord.compute_board_rows(GameState.tiles)
    for tile_data in GameState.tiles.values():
        _paint_fog(tile_data)

func _on_tile_changed(coord_key: String) -> void:
    if _board_rows == 0:
        _board_rows = BoardCoord.compute_board_rows(GameState.tiles)
    if GameState.tiles.has(coord_key):
        _paint_fog(GameState.tiles[coord_key])

func _paint_fog(tile_data: Dictionary) -> void:
    var coord := BoardCoord.to_tilemap_coord(tile_data, _board_rows)
    if tile_data.get("isRevealed", false):
        erase_cell(coord)
    else:
        set_cell(coord, 0, Vector2i(0, 0))
