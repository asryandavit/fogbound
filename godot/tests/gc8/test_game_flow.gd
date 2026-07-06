extends GutTest
# GC8 done-criterion (docs/AGENT.md). Covers the pure, headless-testable parts
# of the game-flow layer: GameState.reset, the match_ended bridge
# (StateMapper.apply_match_ended -> GameState.match_ended), the Results
# outcome/score formatting, and GameFlow's mode → join-options mapping.
# Scene transitions themselves (change_scene_to_file) are not unit-tested —
# they're verified live, like every prior scene/input/camera path.

func before_each() -> void:
    GameState.reset()

func test_reset_clears_all_state() -> void:
    GameState.set_tile("0_0", {"x": 0, "y": 0, "isRevealed": true})
    GameState.set_explorer("e1", {"playerId": "p1", "x": 1, "y": 1})
    GameState.set_player("p1", {"username": "Alice", "score": 5})
    GameState.set_turn_state("p1", 7, "move")
    GameState.mark_initialized()

    GameState.reset()

    assert_eq(GameState.tiles.size(), 0, "tiles cleared")
    assert_eq(GameState.explorers.size(), 0, "explorers cleared")
    assert_eq(GameState.players.size(), 0, "players cleared")
    assert_eq(GameState.current_player_id, "", "current player cleared")
    assert_eq(GameState.turn_number, 0, "turn number cleared")
    assert_eq(GameState.phase, "", "phase cleared")
    assert_false(GameState.is_initialized, "initialized flag cleared")

func test_apply_match_ended_emits_with_winner() -> void:
    watch_signals(GameState)
    StateMapper.apply_match_ended({"winnerId": "p1"})
    assert_signal_emitted_with_parameters(GameState, "match_ended", ["p1"])

func test_apply_match_ended_missing_winner_is_empty_string() -> void:
    watch_signals(GameState)
    StateMapper.apply_match_ended({})  # malformed / no winnerId
    assert_signal_emitted_with_parameters(GameState, "match_ended", [""])

func test_results_outcome_text_win() -> void:
    assert_eq(Results.outcome_text("p1", "p1"), "You Win!")

func test_results_outcome_text_lose() -> void:
    assert_eq(Results.outcome_text("p2", "p1"), "You Lose")

func test_results_outcome_text_empty_winner() -> void:
    assert_eq(Results.outcome_text("", "p1"), "Match Over")

func test_results_format_scores() -> void:
    var players := {
        "p1": {"username": "Alice", "score": 3},
        "p2": {"username": "Bot", "score": 1},
    }
    assert_eq(Results.format_scores(players), "Alice: 3\nBot: 1")

func test_game_flow_join_options_reflects_mode() -> void:
    var previous: bool = GameFlow.vs_bot
    GameFlow.vs_bot = true
    assert_eq(GameFlow.join_options(), {"vsBot": true})
    GameFlow.vs_bot = false
    assert_eq(GameFlow.join_options(), {"vsBot": false})
    GameFlow.vs_bot = previous  # leave the autoload as we found it
