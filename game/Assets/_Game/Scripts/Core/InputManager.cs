using System.Collections.Generic;
using UnityEngine;

public class InputManager : MonoBehaviour
{
    public static InputManager Instance { get; private set; }

    private string _selectedExplorerId;
    private bool _isWaitingForDestination;
    private List<Vector2Int> _validMovePositions;
    private string _localPlayerId;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);

        Instance = this;
        _validMovePositions = new List<Vector2Int>();
    }

    /// <summary>
    /// Sets the local player's identifier. Call this after joining a match.
    /// </summary>
    /// <param name="playerId">The local player's unique identifier.</param>
    public void SetLocalPlayer(string playerId)
    {
        _localPlayerId = playerId;
    }

    /// <summary>
    /// Main input handler called by TileController when a tile is clicked.
    /// Handles explorer selection and move targeting based on current turn state.
    /// </summary>
    /// <param name="position">The grid position of the clicked tile.</param>
    public void OnTileClicked(Vector2Int position)
    {
        if (!IsMyTurn())
            return;

        if (!_isWaitingForDestination)
        {
            List<ExplorerController> myExplorers = ExplorerManager.Instance.GetPlayerExplorers(_localPlayerId);
            foreach (ExplorerController explorer in myExplorers)
            {
                if (explorer.ExplorerData.gridPosition == position)
                {
                    SelectExplorer(explorer.ExplorerData.explorerId);
                    return;
                }
            }
        }
        else
        {
            if (_validMovePositions.Contains(position))
                MoveSelectedExplorer(position);
            else
                ClearSelection();
        }
    }

    /// <summary>
    /// Selects the given explorer and calculates its valid move positions from
    /// passable (non-Water) neighboring tiles.
    /// </summary>
    /// <param name="explorerId">The unique identifier of the explorer to select.</param>
    public void SelectExplorer(string explorerId)
    {
        _selectedExplorerId = explorerId;
        _isWaitingForDestination = true;

        ExplorerController explorer = ExplorerManager.Instance.GetExplorer(explorerId);
        Vector2Int currentPosition = explorer.ExplorerData.gridPosition;
        List<TileData> neighbors = BoardManager.Instance.GetNeighbors(currentPosition);

        _validMovePositions = new List<Vector2Int>();
        foreach (TileData tile in neighbors)
        {
            if (tile.terrainType != TerrainType.Water)
                _validMovePositions.Add(tile.gridPosition);
        }

        Debug.Log("Explorer selected: " + explorerId);
        // TODO: highlight valid move tiles
    }

    /// <summary>
    /// Clears the current explorer selection and resets move targeting state.
    /// </summary>
    public void ClearSelection()
    {
        _selectedExplorerId = string.Empty;
        _isWaitingForDestination = false;
        _validMovePositions.Clear();
        // TODO: clear tile highlights
    }

    /// <summary>
    /// Moves the selected explorer to the given target position and clears the selection.
    /// </summary>
    /// <param name="targetPosition">The grid position to move the selected explorer to.</param>
    public void MoveSelectedExplorer(Vector2Int targetPosition)
    {
        if (NetworkManager.Instance != null && NetworkManager.Instance.IsServerMode)
        {
            // Server-authoritative: send move to server; position update arrives via GameStateSync
            _ = NetworkManager.Instance.SendMoveExplorer(_selectedExplorerId, targetPosition.x, targetPosition.y);
        }
        else
        {
            // Offline mode: apply locally
            ExplorerManager.Instance.MoveExplorer(_selectedExplorerId, targetPosition);
        }
        ClearSelection();
    }

    /// <summary>
    /// Returns true if it is the local player's turn.
    /// </summary>
    public bool IsMyTurn()
    {
        return TurnManager.Instance.CurrentPlayerId == _localPlayerId;
    }
}
