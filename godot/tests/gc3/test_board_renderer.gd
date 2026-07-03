extends GutTest
# GC3 done-criterion. Seeds GameState directly (no live Colyseus connection
# needed) and checks BoardLayer/FogLayer paint the correctly-flipped cells.

var board: BoardLayer
var fog: FogLayer

func before_each() -> void:
    GameState.tiles.clear()
    GameState.is_initialized = false
    board = load("res://scenes/match/board/BoardLayer.tscn").instantiate()
    fog = load("res://scenes/match/board/FogLayer.tscn").instantiate()
    add_child_autofree(board)
    add_child_autofree(fog)

func _seed_grid(size: int) -> void:
    for x in range(size):
        for y in range(size):
            GameState.tiles["%d,%d" % [x, y]] = {
                "x": x, "y": y, "tileType": "grass", "isRevealed": true,
                "treasureType": "none", "treasureValue": 0, "isOccupied": false,
            }

func test_board_paints_terrain_on_initialized() -> void:
    _seed_grid(3)
    GameState.mark_initialized()
    for tile_data in GameState.tiles.values():
        var coord := BoardCoord.to_tilemap_coord(tile_data, 3)
        assert_true(board.get_cell_source_id(coord) >= 0,
            "expected a painted cell at %s for tile %s" % [coord, tile_data])

func test_fog_cell_cleared_on_reveal() -> void:
    _seed_grid(3)
    GameState.mark_initialized()
    var tile_data := {
        "x": 1, "y": 1, "tileType": "grass", "isRevealed": true,
        "treasureType": "none", "treasureValue": 0, "isOccupied": false,
    }
    GameState.set_tile("1,1", tile_data)
    var coord := BoardCoord.to_tilemap_coord(tile_data, 3)
    assert_eq(fog.get_cell_source_id(coord), -1)

func test_fog_cell_present_on_hidden() -> void:
    _seed_grid(3)
    GameState.mark_initialized()
    var tile_data := {
        "x": 1, "y": 1, "tileType": "grass", "isRevealed": false,
        "treasureType": "none", "treasureValue": 0, "isOccupied": false,
    }
    GameState.set_tile("1,1", tile_data)
    var coord := BoardCoord.to_tilemap_coord(tile_data, 3)
    assert_true(fog.get_cell_source_id(coord) >= 0)
