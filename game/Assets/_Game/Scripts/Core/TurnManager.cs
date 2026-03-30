using System.Collections.Generic;
using UnityEngine;

public class TurnManager : MonoBehaviour
{
    public static TurnManager Instance { get; private set; }

    private int _currentPlayerIndex;
    private int _turnNumber;
    private float _turnTimeRemaining;
    private bool _isTurnActive;
    private List<string> _playerIds = new List<string>();

    public int CurrentPlayerIndex => _currentPlayerIndex;
    public int TurnNumber => _turnNumber;
    public float TurnTimeRemaining => _turnTimeRemaining;
    public bool IsTurnActive => _isTurnActive;
    public string CurrentPlayerId => _playerIds.Count > 0 ? _playerIds[_currentPlayerIndex] : string.Empty;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);

        Instance = this;
    }

    private void Update()
    {
        if (_isTurnActive)
        {
            _turnTimeRemaining -= Time.deltaTime;
            if (_turnTimeRemaining <= 0f)
                EndTurn();
        }
    }

    /// <summary>
    /// Initializes the player list and resets turn state. Call this before starting a match.
    /// </summary>
    /// <param name="playerIds">Ordered list of player identifiers participating in the match.</param>
    public void InitializePlayers(List<string> playerIds)
    {
        _playerIds = playerIds;
        _currentPlayerIndex = 0;
        _turnNumber = 0;
    }

    /// <summary>
    /// Starts the current player's turn, activates the timer, and notifies GameManager.
    /// </summary>
    public void StartTurn()
    {
        _isTurnActive = true;
        _turnTimeRemaining = GameManager.Instance.TurnTimerSeconds;
        GameManager.Instance.SetCurrentPlayer(CurrentPlayerId);
    }

    /// <summary>
    /// Ends the current turn, advances to the next player, and increments the turn counter.
    /// </summary>
    public void EndTurn()
    {
        _isTurnActive = false;
        _currentPlayerIndex++;
        if (_currentPlayerIndex >= _playerIds.Count)
            _currentPlayerIndex = 0;
        _turnNumber++;
    }
}
