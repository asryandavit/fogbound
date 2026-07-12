extends GutTest
# GC9 done-criterion. Verifies arrow, cannon, trap treasureTypes paint a
# valid cell (not -1) and do not crash board_layer.gd.

var board: BoardLayer

func before_each() -> void:
    GameState.tiles.clear()
    GameState.is_initialized = false
    board = load("res://scenes/match/board/BoardLayer.tscn").instantiate()
    add_child_autofree(board)

func _seed_single(treasure_type: String) -> void:
    GameState.tiles.clear()
    GameState.tiles["0,0"] = {
        "x": 0, "y": 0, "tileType": "grass", "isRevealed": true,
        "treasureType": treasure_type, "treasureValue": 0, "isOccupied": false,
    }

func test_arrow_north_paints_valid_cell() -> void:
    _seed_single("arrow_north")
    GameState.mark_initialized()
    var coord := BoardCoord.to_tilemap_coord(GameState.tiles["0,0"], 1)
    assert_true(board.get_cell_source_id(coord) >= 0,
        "arrow_north should paint a cell, got -1")

func test_cannon_east_paints_valid_cell() -> void:
    _seed_single("cannon_east")
    GameState.mark_initialized()
    var coord := BoardCoord.to_tilemap_coord(GameState.tiles["0,0"], 1)
    assert_true(board.get_cell_source_id(coord) >= 0,
        "cannon_east should paint a cell, got -1")

func test_trap_paints_valid_cell() -> void:
    _seed_single("trap")
    GameState.mark_initialized()
    var coord := BoardCoord.to_tilemap_coord(GameState.tiles["0,0"], 1)
    assert_true(board.get_cell_source_id(coord) >= 0,
        "trap should paint a cell, got -1")

func test_arrow_south_and_cannon_west_do_not_throw() -> void:
    _seed_single("arrow_south")
    assert_does_not_throw(func(): GameState.mark_initialized())
    GameState.is_initialized = false
    _seed_single("cannon_west")
    assert_does_not_throw(func(): GameState.mark_initialized())
