class_name BoardCoord extends RefCounted
# Shared coordinate transform for board renderers (BoardLayer, FogLayer).
# Server y=0 is the "bottom" row (backend/src/colyseus/rooms/GameRoom.ts
# initializeBoard/spawnExplorers); Godot's TileMapLayer y increases downward,
# so this flip keeps the rendered board oriented the same way as the server.

static func compute_board_rows(tiles: Dictionary) -> int:
    var max_y := 0
    for tile_data in tiles.values():
        max_y = max(max_y, int(tile_data.get("y", 0)))
    return max_y + 1

static func to_tilemap_coord(tile_data: Dictionary, board_rows: int) -> Vector2i:
    var x := int(tile_data.get("x", 0))
    var y := int(tile_data.get("y", 0))
    return Vector2i(x, (board_rows - 1) - y)
