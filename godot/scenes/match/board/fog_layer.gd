class_name FogLayer extends TileMapLayer
# Pure renderer — fog is derived entirely from tile.isRevealed (Decision 047).
# Never computed client-side. Gray-box: one flat-color swatch, no art files.

const FOG_COLOR := Color(0.08, 0.08, 0.10)

var _board_rows: int = 0
var _flipped: bool = false

func _ready() -> void:
    _build_tileset()
    GameState.state_initialized.connect(_on_state_initialized)
    GameState.tile_changed.connect(_on_tile_changed)

func _validated_board_rows() -> int:
    var rows := BoardCoord.compute_board_rows(GameState.tiles)
    if rows < 7: return 0
    if GameState.tiles.size() != rows * rows: return 0
    return rows

# Per-player view orientation (Decision 098). Recomputed fresh on every call —
# never cached — same Decision 061/062 hazard as board_rows.
func _current_flipped() -> bool:
    var local_base_y: int = GameState.players.get(NetworkManager.local_player_id, {}).get("baseY", 0)
    return BoardCoord.is_local_view_flipped(local_base_y)

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
    var rows := _validated_board_rows()
    if rows == 0:
        return  # partial Colyseus delta; tile_changed will retry
    _board_rows = rows
    _flipped = _current_flipped()
    for tile_data in GameState.tiles.values():
        _paint_fog(tile_data)

func _on_tile_changed(coord_key: String) -> void:
    if _board_rows < 7:
        var rows := _validated_board_rows()
        if rows == 0:
            return  # still partial; skip until square board arrives
        _board_rows = rows
        _flipped = _current_flipped()
        for tile_data in GameState.tiles.values():
            _paint_fog(tile_data)
        return
    # See board_layer.gd's _on_tile_changed for why this repaint is needed:
    # local player's baseY can become known/change after the first full
    # repaint, leaving already-painted fog cells stuck in the old orientation.
    var flipped_now := _current_flipped()
    if flipped_now != _flipped:
        _flipped = flipped_now
        for tile_data in GameState.tiles.values():
            _paint_fog(tile_data)
        return
    if GameState.tiles.has(coord_key):
        _paint_fog(GameState.tiles[coord_key])

func _paint_fog(tile_data: Dictionary) -> void:
    var coord := BoardCoord.to_tilemap_coord(tile_data, _board_rows, _flipped)
    if tile_data.get("isRevealed", false):
        erase_cell(coord)
    else:
        set_cell(coord, 0, Vector2i(0, 0))
