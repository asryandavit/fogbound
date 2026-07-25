extends GutTest
# Per-player view orientation (Decision 098). Pure BoardCoord tests — no
# autoload/scene dependency needed, mirroring gc10's board_coord test style.

const BOARD_13_ROWS := 13

# ─── is_local_view_flipped ─────────────────────────────────────────────────

func test_flipped_false_for_base_at_server_y_zero() -> void:
    assert_false(BoardCoord.is_local_view_flipped(0))

func test_flipped_true_for_base_at_far_edge() -> void:
    assert_true(BoardCoord.is_local_view_flipped(BOARD_13_ROWS - 1))

# ─── Forward transform: own base renders at the same on-screen spot ───────
# for BOTH players, regardless of which server edge it's actually on.

func test_unflipped_own_base_center_renders_at_bottom() -> void:
    # slot 0: baseY=0, baseX=6 (center of a 13-col board). Unflipped view.
    var tile_data := {"x": 6, "y": 0}
    var coord := BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS, false)
    assert_eq(coord, Vector2i(6, 12), "slot 0's own base should sit at tilemap row 12 (bottom)")

func test_flipped_own_base_center_renders_at_bottom() -> void:
    # slot 1: baseY=12 (rows-1), baseX=6. Flipped view (local player is slot 1).
    var tile_data := {"x": 6, "y": 12}
    var coord := BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS, true)
    assert_eq(coord, Vector2i(6, 12), "slot 1's own base should ALSO render at tilemap row 12 (bottom) on their own device")

func test_flipped_view_is_genuine_180_rotation_not_just_vertical_mirror() -> void:
    # Server (0,0) — near slot 0's row, far-left column. Under a pure vertical
    # mirror this would still be the LEFT column for a flipped viewer; under a
    # genuine 180° rotation it also swaps to the RIGHT column.
    var tile_data := {"x": 0, "y": 0}
    var coord := BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS, true)
    assert_eq(coord, Vector2i(12, 0), "180 rotation must mirror columns too, not just rows")

func test_unflipped_matches_pre_existing_behavior() -> void:
    # Regression guard: flipped=false (the default) must be byte-identical to
    # the pre-Decision-098 transform for every existing caller.
    var tile_data := {"x": 3, "y": 5}
    assert_eq(BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS),
        Vector2i(3, BoardCoord.flip_row(5, BOARD_13_ROWS)))

# ─── Inverse transform: a tap must resolve to the correct SERVER coord ─────
# in BOTH orientations — this is the critical correctness point (goal spec).

func test_tap_on_unflipped_device_resolves_to_correct_server_coord() -> void:
    # World pos for tilemap (6,12) on a 13-row board: (6*32, 12*32) = (192, 384)
    var result := BoardCoord.from_world_position(Vector2(192.0, 384.0), BOARD_13_ROWS, false)
    assert_eq(result, Vector2i(6, 0), "unflipped tap at own-base screen position must resolve to server (6,0)")

func test_tap_on_flipped_device_resolves_to_correct_server_coord() -> void:
    # Same on-screen position (192, 384) — the flipped player's own base —
    # must resolve to THEIR server coord (6,12), not slot 0's (6,0).
    var result := BoardCoord.from_world_position(Vector2(192.0, 384.0), BOARD_13_ROWS, true)
    assert_eq(result, Vector2i(6, 12), "flipped tap at own-base screen position must resolve to server (6,12)")

func test_tap_on_flipped_device_at_rotated_corner_resolves_correctly() -> void:
    # Tilemap (12,0) [top-right, screen] under flipped=true must resolve back
    # to server (0,0) — the exact inverse of test_flipped_view_is_genuine_180_rotation.
    var world_pos := Vector2(12 * 32.0, 0 * 32.0)
    var result := BoardCoord.from_world_position(world_pos, BOARD_13_ROWS, true)
    assert_eq(result, Vector2i(0, 0))

# ─── Round-trip: forward then inverse returns the original server coord ───
# for every corner and the center, in both orientations.

func _round_trip_points() -> Array:
    return [Vector2i(0, 0), Vector2i(12, 0), Vector2i(0, 12), Vector2i(12, 12), Vector2i(6, 6)]

func test_round_trip_unflipped() -> void:
    for p in _round_trip_points():
        var tile_data := {"x": p.x, "y": p.y}
        var tilemap_coord := BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS, false)
        var world_pos := Vector2(tilemap_coord) * BoardCoord.TILE_PX
        var back := BoardCoord.from_world_position(world_pos, BOARD_13_ROWS, false)
        assert_eq(back, p, "unflipped round-trip failed for %s" % p)

func test_round_trip_flipped() -> void:
    for p in _round_trip_points():
        var tile_data := {"x": p.x, "y": p.y}
        var tilemap_coord := BoardCoord.to_tilemap_coord(tile_data, BOARD_13_ROWS, true)
        var world_pos := Vector2(tilemap_coord) * BoardCoord.TILE_PX
        var back := BoardCoord.from_world_position(world_pos, BOARD_13_ROWS, true)
        assert_eq(back, p, "flipped round-trip failed for %s" % p)

# ─── to_world_position mirrors to_tilemap_coord (used by explorers/camera) ─

func test_to_world_position_flipped_matches_to_tilemap_coord() -> void:
    var coord := Vector2i(6, 12)
    var world_pos := BoardCoord.to_world_position(coord, BOARD_13_ROWS, true)
    assert_eq(world_pos, Vector2(6, 12) * BoardCoord.TILE_PX)

# ─── BoardLayer / FogLayer scene-level: paint the correct orientation ──────
# for whichever local player is set, and self-heal if player data arrives
# after the first paint (the ordering hazard this decision found).

const BOARD_7_ROWS := 7

var board: BoardLayer
var fog: FogLayer

func before_each() -> void:
    GameState.tiles.clear()
    GameState.players.clear()
    GameState.is_initialized = false
    NetworkManager.local_player_id = ""
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

func test_board_layer_paints_flipped_when_local_player_is_far_edge() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.players["p1"] = {"baseY": BOARD_7_ROWS - 1}
    _seed_grid(BOARD_7_ROWS)
    GameState.mark_initialized()
    var tile_data: Dictionary = GameState.tiles["0,0"]
    var expected := BoardCoord.to_tilemap_coord(tile_data, BOARD_7_ROWS, true)
    assert_true(board.get_cell_source_id(expected) >= 0,
        "expected board to paint tile (0,0) at its FLIPPED coord %s" % expected)

func test_fog_layer_flips_similarly() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.players["p1"] = {"baseY": BOARD_7_ROWS - 1}
    _seed_grid(BOARD_7_ROWS)
    GameState.mark_initialized()
    var hidden_tile := {
        "x": 2, "y": 2, "tileType": "grass", "isRevealed": false,
        "treasureType": "none", "treasureValue": 0, "isOccupied": false,
    }
    GameState.set_tile("2,2", hidden_tile)
    var expected := BoardCoord.to_tilemap_coord(hidden_tile, BOARD_7_ROWS, true)
    assert_true(fog.get_cell_source_id(expected) >= 0,
        "expected fog to paint the hidden tile at its FLIPPED coord %s" % expected)

func test_board_layer_repaints_all_tiles_when_player_data_arrives_late() -> void:
    # Simulates the exact ordering hazard Decision 098 found: tiles arrive and
    # get fully painted BEFORE the local player's baseY is known (so the
    # initial paint is unflipped). Player data then arrives, followed by an
    # unrelated single-tile change (e.g. a fog reveal). Every tile painted in
    # the first pass must end up repainted in the NEW (flipped) orientation —
    # not just the one tile that triggered the later event.
    _seed_grid(BOARD_7_ROWS)
    GameState.mark_initialized()  # local_player_id is "" here -> unflipped paint

    var corner_unflipped := BoardCoord.to_tilemap_coord(GameState.tiles["0,0"], BOARD_7_ROWS, false)
    assert_true(board.get_cell_source_id(corner_unflipped) >= 0,
        "sanity check: initial unflipped paint should have painted (0,0) at %s" % corner_unflipped)

    # Player data arrives late, revealing the local player is on the far edge.
    NetworkManager.local_player_id = "p1"
    GameState.players["p1"] = {"baseY": BOARD_7_ROWS - 1}

    # An unrelated tile changes (e.g. a fog reveal on a completely different cell).
    var changed_tile := {
        "x": 4, "y": 4, "tileType": "grass", "isRevealed": true,
        "treasureType": "none", "treasureValue": 0, "isOccupied": false,
    }
    GameState.set_tile("4,4", changed_tile)

    # The (0,0) corner tile must now be repainted at its FLIPPED coord, not
    # left stuck at the stale unflipped one from the first paint.
    var corner_flipped := BoardCoord.to_tilemap_coord(GameState.tiles["0,0"], BOARD_7_ROWS, true)
    assert_true(board.get_cell_source_id(corner_flipped) >= 0,
        "expected full repaint to move (0,0) to its flipped coord %s after late player data" % corner_flipped)

# ─── ExplorerController: flipped positioning, label stays upright ─────────

func test_explorer_positions_at_flipped_world_coord() -> void:
    var explorer: ExplorerController = load("res://scenes/match/explorers/Explorer.tscn").instantiate()
    add_child_autofree(explorer)
    var data := {"explorerId": "p1_e0", "x": 6, "y": 12, "isBot": false}
    explorer.setup("p1_e0", data, BOARD_13_ROWS, true)
    var expected := BoardCoord.to_world_position(Vector2i(6, 12), BOARD_13_ROWS, true)
    assert_eq(explorer.position, expected)

func test_explorer_label_never_rotated_when_flipped() -> void:
    # Regression guard for the "labels must not flip" requirement (Decision
    # 098): the view orientation is implemented entirely as a POSITION
    # transform, never a node rotation, so the Label child must always have
    # rotation == 0 regardless of flipped. If a future change introduces a
    # node-level rotation to achieve the flip, this test catches it.
    var explorer: ExplorerController = load("res://scenes/match/explorers/Explorer.tscn").instantiate()
    add_child_autofree(explorer)
    var data := {"explorerId": "p1_e0", "x": 6, "y": 12, "isBot": false}
    explorer.setup("p1_e0", data, BOARD_13_ROWS, true)
    assert_eq(explorer.rotation, 0.0, "Explorer node itself must not be rotated")
    assert_eq(explorer.label.rotation, 0.0, "Explorer label must render upright")
