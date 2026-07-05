extends Node
# Match scene root. Assembles all GC2-GC7 renderers/controllers (Decision 047's
# Match Scene Tree) and starts the connection. No game logic of its own — pure
# composition root.

func _ready() -> void:
    NetworkManager.connect_to_match()
