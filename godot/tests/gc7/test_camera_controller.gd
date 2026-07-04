extends GutTest
# GC7 done-criterion.

var controller: CameraController

func before_each() -> void:
    GameState.current_player_id = ""
    GameState.explorers.clear()
    GameState.tiles.clear()
    NetworkManager.local_player_id = ""
    controller = CameraController.new()
    add_child_autofree(controller)

func test_auto_pan_fires_on_local_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.explorers["e1"] = {"playerId": "p1", "x": 3, "y": 3}
    var initial: Vector2 = controller._pan_target
    GameState.set_turn_state("p1", 1, "move")
    assert_ne(controller._pan_target, initial)

func test_auto_pan_skipped_on_opponent_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.explorers["e1"] = {"playerId": "p1", "x": 3, "y": 3}
    var initial: Vector2 = controller._pan_target
    GameState.set_turn_state("p2", 1, "move")
    assert_eq(controller._pan_target, initial)

func test_zoom_clamped_at_min() -> void:
    controller.min_zoom = 0.5
    controller.max_zoom = 3.0
    controller.zoom = Vector2(0.5, 0.5)
    controller.apply_pinch_delta(5.0)
    assert_true(controller.zoom.x >= controller.min_zoom)

func test_zoom_clamped_at_max() -> void:
    controller.min_zoom = 0.5
    controller.max_zoom = 3.0
    controller.zoom = Vector2(3.0, 3.0)
    controller.apply_pinch_delta(-5.0)
    assert_true(controller.zoom.x <= controller.max_zoom)
