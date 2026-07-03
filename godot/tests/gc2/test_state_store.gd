extends GutTest
# GC2 done-criterion (docs/AGENT.md, docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md).
# Exercises StateMapper -> GameState directly with synthetic Dictionaries.
# No live Colyseus connection needed for this suite.

func before_each() -> void:
    GameState.tiles.clear()
    GameState.explorers.clear()
    GameState.players.clear()
    GameState.current_player_id = ""
    GameState.turn_number = 0
    GameState.phase = ""
    GameState.is_initialized = false

func test_game_state_starts_empty() -> void:
    assert_eq(GameState.tiles.size(), 0)
    assert_eq(GameState.explorers.size(), 0)
    assert_eq(GameState.current_player_id, "")
    assert_false(GameState.is_initialized)

func test_apply_tile_change() -> void:
    watch_signals(GameState)
    StateMapper.apply_tile_change("0_0", {
        "x": 0, "y": 0, "tileType": "terrain", "isRevealed": true,
        "treasureType": "", "treasureValue": 0, "isOccupied": false,
    })
    assert_true(GameState.tiles.has("0_0"))
    assert_true(GameState.tiles["0_0"]["isRevealed"])
    assert_signal_emitted(GameState, "tile_changed")

func test_apply_explorer_change() -> void:
    watch_signals(GameState)
    StateMapper.apply_explorer_change("e1", {
        "explorerId": "e1", "playerId": "p1", "x": 3, "y": 5,
        "state": "idle", "score": 0, "coinCount": 0, "hasBag": false,
        "hasBoat": false, "hasShield": false, "isBot": false, "botMoveCount": 0,
    })
    assert_true(GameState.explorers.has("e1"))
    assert_signal_emit_count(GameState, "explorer_added", 1)

func test_apply_turn_change() -> void:
    watch_signals(GameState)
    StateMapper.apply_turn_change({
        "currentPlayerId": "p1", "turnNumber": 1, "phase": "move",
    })
    assert_eq(GameState.current_player_id, "p1")
    assert_signal_emitted(GameState, "turn_changed")

func test_finalize_initialization() -> void:
    watch_signals(GameState)
    StateMapper.finalize_initialization()
    assert_signal_emit_count(GameState, "state_initialized", 1)
    assert_true(GameState.is_initialized)
