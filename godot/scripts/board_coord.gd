class_name BoardCoord extends RefCounted
# Shared coordinate transform for board renderers (BoardLayer, FogLayer,
# ExplorerController). Server y=0 is the "bottom" row (backend/src/colyseus/
# rooms/GameRoom.ts initializeBoard/spawnExplorers); Godot's TileMapLayer y
# increases downward, so this flip keeps the rendered board oriented the
# same way as the server.

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

static func to_tilemap_coord(tile_data: Dictionary, board_rows: int) -> Vector2i:
    var x := int(tile_data.get("x", 0))
    var y := int(tile_data.get("y", 0))
    return Vector2i(x, flip_row(y, board_rows))

static func to_world_position(coord: Vector2i, board_rows: int) -> Vector2:
    return Vector2(coord.x, flip_row(coord.y, board_rows)) * TILE_PX

## Inverse of to_world_position. flip_row is a self-inverse ((rows-1)-y applied
## twice returns y), so the same function un-flips the row back to server space.
## int() (floor for non-negative values) maps the FULL tile cell to one coord;
## round() would shift the right half of every cell to the adjacent cell.
static func from_world_position(world_pos: Vector2, board_rows: int) -> Vector2i:
    var col := int(world_pos.x / TILE_PX)
    var row := int(world_pos.y / TILE_PX)
    return Vector2i(col, flip_row(row, board_rows))
