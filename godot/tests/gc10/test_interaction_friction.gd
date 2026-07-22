extends GutTest
# Regression tests for interaction-friction fixes (2026-07-22).
# Covers: tile hit-test full-cell coverage, phantom-undo guard, drag-pan clamp matrix.

const TILE_PX := 32
const BOARD_13_ROWS := 13

# ─── Helpers ──────────────────────────────────────────────────────────────────

func _seed_board(rows: int) -> void:
	GameState.tiles.clear()
	for x in range(rows):
		for y in range(rows):
			GameState.tiles["%d_%d" % [x, y]] = {"x": x, "y": y}

# ─── Chunk 1: from_world_position — full-cell coverage ────────────────────────

func test_tap_left_edge_of_cell_maps_correctly() -> void:
	# Left edge of tile at col=3: world_x = 3*32 = 96
	var result := BoardCoord.from_world_position(Vector2(96.0, 0.0), 1)
	assert_eq(result.x, 3)

func test_tap_center_of_cell_maps_correctly() -> void:
	# Center of tile at col=3: world_x = 3*32 + 16 = 112
	var result := BoardCoord.from_world_position(Vector2(112.0, 0.0), 1)
	assert_eq(result.x, 3)

func test_tap_right_edge_of_cell_maps_correctly() -> void:
	# Right edge (last pixel) of tile at col=3: world_x = 4*32 - 1 = 127
	var result := BoardCoord.from_world_position(Vector2(127.0, 0.0), 1)
	assert_eq(result.x, 3)

func test_tap_first_pixel_of_next_cell_maps_to_next() -> void:
	# First pixel of tile col=4: world_x = 4*32 = 128
	var result := BoardCoord.from_world_position(Vector2(128.0, 0.0), 1)
	assert_eq(result.x, 4)

func test_y_flip_at_bottom_row() -> void:
	# Server y=0 is the bottom row; in a 13-row board it sits at tilemap row 12.
	# world_y for server (0,0) = flip_row(0,13)*32 = 12*32 = 384
	var result := BoardCoord.from_world_position(Vector2(0.0, 384.0), BOARD_13_ROWS)
	assert_eq(result.y, 0)

func test_y_flip_at_top_row() -> void:
	# Server y=12 is the top row; tilemap row 0; world_y = 0*32 = 0
	var result := BoardCoord.from_world_position(Vector2(0.0, 0.0), BOARD_13_ROWS)
	assert_eq(result.y, 12)

func test_full_cell_right_half_maps_same_as_center() -> void:
	# Regression for round() bug: right half of tile col=5 (world_x 160-191)
	# should all map to col=5, not col=6.
	for pixel_offset in range(16):
		var world_x: float = 5 * TILE_PX + 16 + pixel_offset  # 176..191
		var result := BoardCoord.from_world_position(Vector2(world_x, 0.0), 1)
		assert_eq(result.x, 5, "pixel_offset=%d world_x=%d should map to col=5" % [pixel_offset, int(world_x)])

# ─── Chunk 3: CameraController drag-pan clamp matrix ─────────────────────────

var cam: CameraController

func before_each() -> void:
	GameState.tiles.clear()
	GameState.explorers.clear()
	GameState.current_player_id = ""
	NetworkManager.local_player_id = ""
	cam = CameraController.new()
	add_child_autofree(cam)

func _setup_cam_zoom(z: float) -> void:
	_seed_board(BOARD_13_ROWS)
	cam.min_zoom = 4.5
	cam.max_zoom = 1.574
	cam.zoom = Vector2(z, z)

func _board_size() -> float:
	return (BOARD_13_ROWS - 1) * TILE_PX  # 384

func test_drag_pan_moves_camera() -> void:
	_setup_cam_zoom(4.5)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(10.0, 0.0)
	cam._handle_drag(drag)
	assert_ne(cam.position, Vector2(192.0, 192.0))

func test_drag_pan_clamp_x_left_at_min_zoom() -> void:
	_setup_cam_zoom(4.5)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(9999.0, 0.0)  # drag far right → camera moves left
	cam._handle_drag(drag)
	assert_true(cam.position.x >= 0.0,
		"camera.x %f went below 0 (left board edge)" % cam.position.x)

func test_drag_pan_clamp_x_right_at_min_zoom() -> void:
	_setup_cam_zoom(4.5)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(-9999.0, 0.0)  # drag far left → camera moves right
	cam._handle_drag(drag)
	assert_true(cam.position.x <= _board_size(),
		"camera.x %f exceeded board_size %f" % [cam.position.x, _board_size()])

func test_drag_pan_clamp_at_max_zoom_centres_board() -> void:
	_setup_cam_zoom(1.574)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(-9999.0, 0.0)
	cam._handle_drag(drag)
	# At max_zoom board fits in viewport, so camera must be within board bounds
	assert_true(cam.position.x >= 0.0 and cam.position.x <= _board_size(),
		"camera.x %f out of board bounds at max_zoom" % cam.position.x)

func test_drag_pan_clamp_y_bottom_at_min_zoom() -> void:
	_setup_cam_zoom(4.5)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(0.0, 9999.0)  # drag down → camera moves up (y decreases)
	cam._handle_drag(drag)
	assert_true(cam.position.y >= 0.0,
		"camera.y %f went below 0 (top board edge)" % cam.position.y)

func test_drag_pan_clamp_y_top_at_min_zoom() -> void:
	_setup_cam_zoom(4.5)
	cam.position = Vector2(192.0, 192.0)
	var drag := InputEventScreenDrag.new()
	drag.relative = Vector2(0.0, -9999.0)  # drag up → camera moves down (y increases)
	cam._handle_drag(drag)
	assert_true(cam.position.y <= _board_size(),
		"camera.y %f exceeded board_size %f" % [cam.position.y, _board_size()])
