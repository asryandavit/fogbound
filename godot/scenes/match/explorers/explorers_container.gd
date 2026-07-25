class_name ExplorersContainer extends Node2D
# Spawns/despawns/updates ExplorerController instances from GameState signals
# only (Decision 047/048). Pure renderer — no game logic.

const EXPLORER_SCENE := preload("res://scenes/match/explorers/Explorer.tscn")

var _nodes: Dictionary = {}

func _ready() -> void:
    GameState.state_initialized.connect(_on_state_initialized)
    GameState.explorer_added.connect(_on_explorer_added)
    GameState.explorer_moved.connect(_on_explorer_moved)
    GameState.explorer_removed.connect(_on_explorer_removed)

## Per-player view orientation (Decision 098). Recomputed fresh on every call
## — never cached — same Decision 061/062 hazard as board_rows: player data
## can populate in any order relative to tiles/explorers.
func _current_flipped() -> bool:
    var local_base_y: int = GameState.players.get(NetworkManager.local_player_id, {}).get("baseY", 0)
    return BoardCoord.is_local_view_flipped(local_base_y)

func _on_state_initialized() -> void:
    # Defensive re-sync: empirically, GameState.state_initialized can fire
    # before tiles/explorers are populated for the SAME patch (Colyseus
    # processes collections in an order independent of callback registration
    # order — confirmed during GC4 live testing), so this may run with an
    # empty _nodes. Recomputing board_rows fresh on every add/move (below)
    # is what actually keeps positions correct; this just re-syncs anything
    # already spawned in case a future ordering puts real data here first.
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    var flipped := _current_flipped()
    for id in _nodes.keys():
        if GameState.explorers.has(id):
            _nodes[id].update_from_state(GameState.explorers[id], board_rows, flipped)

func _on_explorer_added(id: String) -> void:
    if _nodes.has(id) or not GameState.explorers.has(id):
        return
    # Always recompute — do not trust GameState.is_initialized as a
    # "tiles are complete" signal; it does not reliably order against
    # collection population (see _on_state_initialized comment).
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    var flipped := _current_flipped()
    var node: ExplorerController = EXPLORER_SCENE.instantiate()
    add_child(node)
    node.setup(id, GameState.explorers[id], board_rows, flipped)
    _nodes[id] = node

func _on_explorer_moved(id: String) -> void:
    if not _nodes.has(id) or not GameState.explorers.has(id):
        return
    var board_rows := BoardCoord.compute_board_rows(GameState.tiles)
    var flipped := _current_flipped()
    _nodes[id].update_from_state(GameState.explorers[id], board_rows, flipped)

func _on_explorer_removed(id: String) -> void:
    if not _nodes.has(id):
        return
    _nodes[id].queue_free()
    _nodes.erase(id)
