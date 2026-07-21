extends GutTest
# GC6 done-criterion. Driven only by GameState/NetworkManager signals.

var hud: Hud

func before_each() -> void:
    GameState.current_player_id = ""
    NetworkManager.local_player_id = ""
    hud = load("res://scenes/match/hud/Hud.tscn").instantiate()
    add_child_autofree(hud)

func test_turn_banner_your_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.set_turn_state("p1", 1, "move")
    assert_eq(hud.turn_banner.text, "Your Turn")

func test_turn_banner_opponent_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.set_turn_state("p2", 1, "move")
    assert_true("Waiting…" in hud.turn_banner.text)

func test_end_turn_enabled_your_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.set_turn_state("p1", 1, "move")
    assert_false(hud.end_turn_button.disabled)

func test_end_turn_disabled_opponent_turn() -> void:
    NetworkManager.local_player_id = "p1"
    GameState.set_turn_state("p2", 1, "move")
    assert_true(hud.end_turn_button.disabled)

func test_undo_hidden_initially() -> void:
    assert_false(hud.undo_button.visible)

func test_undo_appears_after_send_move() -> void:
    NetworkManager.move_sent.emit()
    assert_true(hud.undo_button.visible)

func test_exit_button_exists() -> void:
    assert_not_null(hud.exit_button)

func test_exit_button_visible() -> void:
    assert_true(hud.exit_button.visible)

func test_exit_button_wired_to_leave_match() -> void:
    assert_true(hud.exit_button.is_connected("pressed", hud._on_exit_pressed))
