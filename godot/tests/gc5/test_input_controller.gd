extends GutTest
# GC5 done-criterion. MockNetworkManager only intercepts send_move — the
# whose-turn guard reads local_player_id directly off the real NetworkManager
# autoload (a plain string, harmless to set in tests).

class MockNetworkManager:
    var send_move_called := false
    var last_send := {}
    func send_move(explorer_id: String, target_x: int, target_y: int) -> void:
        send_move_called = true
        last_send = {"explorer_id": explorer_id, "x": target_x, "y": target_y}

var controller: InputController
var mock_net: MockNetworkManager

func before_each() -> void:
    GameState.tiles.clear()
    GameState.explorers.clear()
    GameState.current_player_id = ""
    NetworkManager.local_player_id = ""
    controller = InputController.new()
    add_child_autofree(controller)
    mock_net = MockNetworkManager.new()
    controller.network_sender = mock_net

func test_tap_ignored_when_not_your_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.current_player_id = "p2"
    controller.on_tap(Vector2i(1, 1))
    assert_false(mock_net.send_move_called)

func test_select_then_confirm_sends_move() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.current_player_id = "p1"
    GameState.explorers["e1"] = {"explorerId": "e1", "playerId": "p1", "x": 1, "y": 1}
    controller.on_tap(Vector2i(1, 1))
    controller.on_tap(Vector2i(1, 2))
    assert_eq(mock_net.last_send, {"explorer_id": "e1", "x": 1, "y": 2})

func test_game_state_unchanged_after_tap() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.current_player_id = "p1"
    GameState.explorers["e1"] = {"explorerId": "e1", "playerId": "p1", "x": 1, "y": 1}
    var tiles_before := GameState.tiles
    var explorers_before := GameState.explorers
    controller.on_tap(Vector2i(1, 1))
    controller.on_tap(Vector2i(1, 2))
    assert_eq(GameState.tiles, tiles_before)
    assert_eq(GameState.explorers, explorers_before)
