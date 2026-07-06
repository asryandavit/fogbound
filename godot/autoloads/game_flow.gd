extends Node
# GameFlow — autoload singleton. Owns scene transitions between the main menu
# and a match, and carries the selected match mode across the scene change
# (autoloads persist; a freshly-loaded scene can't be handed constructor args).
#
# Holds NO game state — that lives in GameState. Touches NO Colyseus.* — it
# drives matches only through NetworkManager's public API (Decision 043).
# Scene changes are inherently not headless-unit-testable, so this file is
# verified live; only its plain data (vs_bot / join_options) is unit-covered.

const MAIN_MENU_SCENE := "res://scenes/menu/MainMenu.tscn"
const MATCH_SCENE := "res://scenes/match/Match.tscn"

## Selected opponent mode, read by match.gd on _ready to build join options.
## true → solo match vs the server-side bot; false → matchmake vs a human.
var vs_bot: bool = true

## Menu → match. Records the chosen mode, then loads the match scene, whose
## _ready() connects with these options. This preserves the "scene present,
## THEN connect" ordering every GC task relied on (connecting before the
## renderers exist would let the initial state arrive with nothing listening).
func start_match(p_vs_bot: bool) -> void:
	vs_bot = p_vs_bot
	get_tree().change_scene_to_file(MATCH_SCENE)

## Results → play the same mode again. Leave the finished room first; the new
## match scene's _ready() reconnects, and connect_to_match() resets GameState.
func play_again() -> void:
	NetworkManager.disconnect_from_match()
	get_tree().change_scene_to_file(MATCH_SCENE)

## Results/anywhere → main menu. Leave the room; GameState is reset on the
## next connect so no stale board is ever shown behind or after the menu.
func to_main_menu() -> void:
	NetworkManager.disconnect_from_match()
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)

## Join options for the current mode, consumed by match.gd → connect_to_match.
func join_options() -> Dictionary:
	return { "vsBot": vs_bot }
