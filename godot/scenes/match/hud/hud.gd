class_name Hud extends CanvasLayer
# Board-first floating HUD (Decision 051), gray-box: bare Controls, no art
# (Decision 058). Driven only by GameState/NetworkManager signals — never
# calls the server directly except via NetworkManager.send_end_turn().

@onready var turn_banner: Label = $TurnBanner
@onready var end_turn_button: Button = $EndTurnButton
@onready var undo_button: Button = $UndoButton
@onready var exit_button: Button = $ExitButton

func _ready() -> void:
	undo_button.visible = false
	end_turn_button.pressed.connect(_on_end_turn_pressed)
	exit_button.pressed.connect(_on_exit_pressed)
	GameState.turn_changed.connect(_on_turn_changed)
	NetworkManager.move_sent.connect(_on_move_sent)
	_update_turn_ui()

func _update_turn_ui() -> void:
	var is_your_turn := GameState.current_player_id == NetworkManager.local_player_id
	turn_banner.text = "Your Turn" if is_your_turn else "Waiting…"
	end_turn_button.disabled = not is_your_turn

func _on_turn_changed() -> void:
	_update_turn_ui()
	undo_button.visible = false

func _on_move_sent() -> void:
	undo_button.visible = true

func _on_end_turn_pressed() -> void:
	NetworkManager.send_end_turn()

func _on_exit_pressed() -> void:
	GameFlow.to_main_menu()
