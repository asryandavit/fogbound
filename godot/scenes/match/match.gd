extends Node
# Match scene root. Assembles all GC2-GC7 renderers/controllers (Decision 047's
# Match Scene Tree) and starts the connection. No game logic of its own — pure
# composition root.

func _ready() -> void:
    # Connect with the mode chosen in the main menu (carried by GameFlow across
    # the scene change). Connecting here — after all renderers exist — keeps the
    # "scene present, THEN connect" ordering the client has always relied on.
    NetworkManager.connect_to_match(GameFlow.join_options())
