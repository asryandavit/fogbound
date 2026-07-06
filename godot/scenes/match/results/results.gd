class_name Results extends CanvasLayer
# Results overlay (Decision 058 gray-box: bare Controls, no art). Hidden until
# GameState.match_ended fires, then shows the outcome + final scores with
# Play Again / Main Menu. Reads GameState only; drives transitions through
# GameFlow. Never calls the server. Sits on a higher CanvasLayer than the HUD
# so it covers it when a match ends.

@onready var _panel: Control = $Panel
@onready var _outcome: Label = $Panel/CenterContainer/VBox/Outcome
@onready var _scores: Label = $Panel/CenterContainer/VBox/Scores
@onready var _play_again: Button = $Panel/CenterContainer/VBox/PlayAgain
@onready var _main_menu: Button = $Panel/CenterContainer/VBox/MainMenu

func _ready() -> void:
	_panel.visible = false
	GameState.match_ended.connect(_on_match_ended)
	_play_again.pressed.connect(func() -> void: GameFlow.play_again())
	_main_menu.pressed.connect(func() -> void: GameFlow.to_main_menu())

func _on_match_ended(winner_id: String) -> void:
	_outcome.text = outcome_text(winner_id, NetworkManager.local_player_id)
	_scores.text = format_scores(GameState.players)
	_panel.visible = true

## Pure: what the local player should see given who won. Extracted so the
## win/lose decision is unit-testable without a live match or scene tree.
static func outcome_text(winner_id: String, local_id: String) -> String:
	if winner_id.is_empty():
		return "Match Over"
	return "You Win!" if winner_id == local_id else "You Lose"

## Pure: "username: score" per player, one per line. Order follows the
## players dict (server slot order in practice).
static func format_scores(players: Dictionary) -> String:
	var lines: PackedStringArray = []
	for pid in players.keys():
		var p: Dictionary = players[pid]
		lines.append("%s: %d" % [str(p.get("username", pid)), int(p.get("score", 0))])
	return "\n".join(lines)
