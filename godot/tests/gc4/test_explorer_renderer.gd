extends GutTest
# GC4 done-criterion. Uses GameState.set_explorer() (the real signal-emitting
# API from GC2) rather than calling signals directly.

var container: ExplorersContainer

func before_each() -> void:
    GameState.explorers.clear()
    GameState.tiles.clear()
    GameState.is_initialized = false
    container = load("res://scenes/match/explorers/Explorers.tscn").instantiate()
    add_child_autofree(container)

func test_explorer_spawns_on_added() -> void:
    GameState.set_explorer("e1", {
        "explorerId": "e1", "playerId": "p1", "x": 0, "y": 0, "state": "idle",
        "score": 0, "coinCount": 0, "hasBag": false, "hasBoat": false,
        "hasShield": false, "isBot": false, "botMoveCount": 0,
    })
    assert_eq(container.get_child_count(), 1)

func test_explorer_position_on_moved() -> void:
    GameState.set_explorer("e1", {
        "explorerId": "e1", "playerId": "p1", "x": 0, "y": 0, "state": "idle",
        "score": 0, "coinCount": 0, "hasBag": false, "hasBoat": false,
        "hasShield": false, "isBot": false, "botMoveCount": 0,
    })
    GameState.set_explorer("e1", {
        "explorerId": "e1", "playerId": "p1", "x": 2, "y": 3, "state": "idle",
        "score": 0, "coinCount": 0, "hasBag": false, "hasBoat": false,
        "hasShield": false, "isBot": false, "botMoveCount": 0,
    })
    var node: ExplorerController = container.get_child(0)
    assert_eq(node.target_coord, Vector2i(2, 3))

func test_bot_badge_visible_when_bot() -> void:
    var explorer: ExplorerController = load("res://scenes/match/explorers/Explorer.tscn").instantiate()
    add_child_autofree(explorer)
    explorer.setup("e1", {"explorerId": "e1", "x": 0, "y": 0, "isBot": true}, 3)
    assert_true(explorer.bot_badge.visible)

func test_bot_badge_hidden_when_human() -> void:
    var explorer: ExplorerController = load("res://scenes/match/explorers/Explorer.tscn").instantiate()
    add_child_autofree(explorer)
    explorer.setup("e1", {"explorerId": "e1", "x": 0, "y": 0, "isBot": false}, 3)
    assert_false(explorer.bot_badge.visible)
