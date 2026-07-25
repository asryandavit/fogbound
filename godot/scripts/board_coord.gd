class_name BoardCoord extends RefCounted
# Shared coordinate transform for board renderers (BoardLayer, FogLayer,
# ExplorerController). Server y=0 is the "bottom" row (backend/src/colyseus/
# rooms/GameRoom.ts initializeBoard/spawnExplorers); Godot's TileMapLayer y
# increases downward, so this flip keeps the rendered board oriented the
# same way as the server.
#
# Per-player view orientation (Decision 098): the row-flip above is a
# UNIVERSAL transform applied identically for every client. On top of it,
# each function also takes an optional `flipped` flag — a 180° rotation
# about the board center, applied only for the local player whose base is
# NOT on server y=0, so their own base renders at the bottom of the screen
# instead of the top. `flipped` must be derived fresh from
# GameState.players[local_player_id].baseY at every call site (never
# hardcoded to a slot number, never cached — same Decision 061/062 hazard
# as board_rows: player data can arrive in any order relative to tiles).

const TILE_PX := 32

## Returns 0 for an empty dict (no data yet) so callers can reliably guard on
## "== 0" to mean "not computed yet" — an unguarded max_y+1 would return 1 for
## an empty dict, which is indistinguishable from a genuine 1-row board.
static func compute_board_rows(tiles: Dictionary) -> int:
    if tiles.is_empty():
        return 0
    var max_y := 0
    for tile_data in tiles.values():
        max_y = max(max_y, int(tile_data.get("y", 0)))
    return max_y + 1

static func flip_row(y: int, board_rows: int) -> int:
    return (board_rows - 1) - y

## True when the LOCAL player's own base is not on the server's y=0 edge —
## meaning that, under flip_row() alone, their own base would render at the
## TOP of the screen instead of the bottom. Board is always square (GDD:
## 7/9/11/13/15/17), and server-side (GameRoom.ts addPlayer) only ever
## assigns baseY = 0 or baseY = rows-1, so this single comparison covers
## both possible bases without needing board_rows or a slot number.
static func is_local_view_flipped(local_base_y: int) -> bool:
    return local_base_y != 0

## Applies the universal row-flip, then (if flipped) a 180° rotation about
## the board center — the single shared core of to_tilemap_coord/
## to_world_position's forward transform.
static func _view_coord(x: int, y: int, board_rows: int, flipped: bool) -> Vector2i:
    var coord := Vector2i(x, flip_row(y, board_rows))
    if flipped:
        coord = Vector2i(board_rows - 1 - coord.x, board_rows - 1 - coord.y)
    return coord

static func to_tilemap_coord(tile_data: Dictionary, board_rows: int, flipped: bool = false) -> Vector2i:
    var x := int(tile_data.get("x", 0))
    var y := int(tile_data.get("y", 0))
    return _view_coord(x, y, board_rows, flipped)

static func to_world_position(coord: Vector2i, board_rows: int, flipped: bool = false) -> Vector2:
    return Vector2(_view_coord(coord.x, coord.y, board_rows, flipped)) * TILE_PX

## Inverse of to_world_position/to_tilemap_coord. flip_row and the 180°
## rotation are each self-inverse, but the ORDER must reverse: the forward
## transform is row-flip THEN rotate, so the inverse is rotate-undo THEN
## row-flip-undo (see Decision 098 for the derivation — applying them in
## the same order as forward would not invert the transform).
## int() (floor for non-negative values) maps the FULL tile cell to one coord;
## round() would shift the right half of every cell to the adjacent cell
## (Decision 091).
static func from_world_position(world_pos: Vector2, board_rows: int, flipped: bool = false) -> Vector2i:
    var col := int(world_pos.x / TILE_PX)
    var row := int(world_pos.y / TILE_PX)
    var coord := Vector2i(col, row)
    if flipped:
        coord = Vector2i(board_rows - 1 - coord.x, board_rows - 1 - coord.y)
    return Vector2i(coord.x, flip_row(coord.y, board_rows))
