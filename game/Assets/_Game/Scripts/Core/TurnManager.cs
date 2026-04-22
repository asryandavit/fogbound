using System.Collections.Generic;
using UnityEngine;

public class TurnManager : MonoBehaviour
{
    public static TurnManager Instance { get; private set; }

    private int   _currentPlayerIndex;
    private int   _turnNumber;
    private float _turnTimeRemaining;
    private bool  _isTurnActive;
    private bool  _serverControlled;
    private List<string> _playerIds = new List<string>();

    public int    CurrentPlayerIndex => _currentPlayerIndex;
    public int    TurnNumber         => _turnNumber;
    public float  TurnTimeRemaining  => _turnTimeRemaining;
    public bool   IsTurnActive       => _isTurnActive;
    public string CurrentPlayerId    => _playerIds.Count > 0 ? _playerIds[_currentPlayerIndex] : string.Empty;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);
        Instance = this;
    }

    private void Update()
    {
        // Local timer only runs when not server-controlled
        if (_isTurnActive && !_serverControlled)
        {
            _turnTimeRemaining -= Time.deltaTime;
            if (_turnTimeRemaining <= 0f)
                EndTurn();
        }
    }

    /// <summary>
    /// Initializes the player list and resets turn state. Call before starting a match.
    /// </summary>
    public void InitializePlayers(List<string> playerIds)
    {
        _playerIds          = playerIds;
        _currentPlayerIndex = 0;
        _turnNumber         = 0;
    }

    /// <summary>
    /// Starts the current player's turn, activates the local timer, and notifies GameManager.
    /// Not called when server is controlling turns.
    /// </summary>
    public void StartTurn()
    {
        if (_serverControlled) return;
        _isTurnActive      = true;
        _turnTimeRemaining = GameManager.Instance.TurnTimerSeconds;
        GameManager.Instance.SetCurrentPlayer(CurrentPlayerId);
    }

    /// <summary>
    /// Ends the current turn locally and advances to the next player.
    /// </summary>
    public void EndTurn()
    {
        _isTurnActive = false;
        _currentPlayerIndex = (_currentPlayerIndex + 1) % Mathf.Max(_playerIds.Count, 1);
        _turnNumber++;
    }

    /// <summary>
    /// Applies authoritative turn state from the Colyseus server.
    /// Disables the local timer while server is in control.
    /// </summary>
    public void ApplyServerTurnState(string currentPlayerId, int turnNumber)
    {
        _serverControlled = true;
        _isTurnActive     = false;
        _turnNumber       = turnNumber;

        int idx = _playerIds.IndexOf(currentPlayerId);
        _currentPlayerIndex = idx >= 0 ? idx : 0;

        GameManager.Instance?.SetCurrentPlayer(currentPlayerId);
    }
}
