using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [SerializeField] private Vector2Int boardSize = new Vector2Int(13, 13);
    [SerializeField] private int maxPlayers = 4;
    [SerializeField] private float turnTimerSeconds = 60f;

    private bool _isGameStarted;
    private string _currentPlayerId;

    public Vector2Int BoardSize => boardSize;
    public int MaxPlayers => maxPlayers;
    public float TurnTimerSeconds => turnTimerSeconds;
    public bool IsGameStarted => _isGameStarted;
    public string CurrentPlayerId => _currentPlayerId;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    /// <summary>
    /// Called when a match begins. Initializes game state.
    /// </summary>
    public void StartGame()
    {
    }

    /// <summary>
    /// Called when a match ends. Cleans up game state.
    /// </summary>
    public void EndGame()
    {
    }

    /// <summary>
    /// Advances the turn to the next player in the rotation.
    /// </summary>
    public void NextTurn()
    {
    }

    /// <summary>
    /// Sets the current active player by their unique identifier.
    /// </summary>
    /// <param name="playerId">The unique identifier of the player to set as current.</param>
    public void SetCurrentPlayer(string playerId)
    {
    }
}
