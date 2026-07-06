extends Control
# MainMenu — the app's entry scene (run/main_scene). Gray-box per Decision 058:
# bare buttons, no art. Lets the player pick an opponent, then hands off to
# GameFlow. Reads/writes no game state and never touches Colyseus — the front
# door only decides which kind of match to start.

@onready var _play_vs_bot: Button = $CenterContainer/VBox/PlayVsBot
@onready var _play_vs_player: Button = $CenterContainer/VBox/PlayVsPlayer
@onready var _quit: Button = $CenterContainer/VBox/Quit

func _ready() -> void:
	_play_vs_bot.pressed.connect(func() -> void: GameFlow.start_match(true))
	_play_vs_player.pressed.connect(func() -> void: GameFlow.start_match(false))
	_quit.pressed.connect(func() -> void: get_tree().quit())
