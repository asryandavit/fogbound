using System.Collections.Generic;
using UnityEngine;

public class ExplorerManager : MonoBehaviour
{
    public static ExplorerManager Instance { get; private set; }

    [SerializeField] private GameObject explorerPrefab;
    [SerializeField] private Color[] teamColors = new Color[]
    {
        Color.red,
        Color.blue,
        Color.green,
        Color.yellow
    };

    private Dictionary<string, ExplorerController> _explorers = new Dictionary<string, ExplorerController>();

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
    }

    /// <summary>
    /// Spawns a new explorer on the board, initializes it with the given data and team color,
    /// and registers it in the manager.
    /// </summary>
    /// <param name="explorerId">Unique identifier for this explorer.</param>
    /// <param name="playerId">The owning player's identifier.</param>
    /// <param name="playerSlot">Player slot index used to pick a team color (0–3).</param>
    /// <param name="startPosition">The starting grid position for this explorer.</param>
    /// <returns>The newly created ExplorerController.</returns>
    public ExplorerController SpawnExplorer(string explorerId, string playerId, int playerSlot, Vector2Int startPosition)
    {
        ExplorerData data = new ExplorerData(explorerId, playerId);
        data.gridPosition = startPosition;

        Vector3 worldPosition = new Vector3(startPosition.x, startPosition.y, 0f);
        GameObject go = Instantiate(explorerPrefab, worldPosition, Quaternion.identity);

        ExplorerController controller = go.GetComponent<ExplorerController>();
        Color color = teamColors[Mathf.Clamp(playerSlot, 0, teamColors.Length - 1)];
        controller.Initialize(data, color);

        _explorers[explorerId] = controller;
        return controller;
    }

    /// <summary>
    /// Returns the ExplorerController with the given explorer ID, or null if not found.
    /// </summary>
    /// <param name="explorerId">The unique identifier of the explorer to retrieve.</param>
    public ExplorerController GetExplorer(string explorerId)
    {
        _explorers.TryGetValue(explorerId, out ExplorerController controller);
        return controller;
    }

    /// <summary>
    /// Returns all explorers belonging to a specific player.
    /// </summary>
    /// <param name="playerId">The player whose explorers to retrieve.</param>
    public List<ExplorerController> GetPlayerExplorers(string playerId)
    {
        var result = new List<ExplorerController>();
        foreach (var controller in _explorers.Values)
        {
            if (controller.ExplorerData.playerId == playerId)
                result.Add(controller);
        }
        return result;
    }

    /// <summary>
    /// Moves an explorer to the target grid position if it has remaining moves.
    /// Updates BoardManager tile occupancy for both the old and new positions.
    /// </summary>
    /// <param name="explorerId">The ID of the explorer to move.</param>
    /// <param name="targetPosition">The destination grid position.</param>
    public void MoveExplorer(string explorerId, Vector2Int targetPosition)
    {
        ExplorerController controller = GetExplorer(explorerId);
        if (controller == null)
            return;

        ExplorerData data = controller.ExplorerData;
        if (!data.CanMove())
            return;

        Vector2Int previousPosition = data.gridPosition;
        data.UseMove();

        // Update tile occupants
        TileData oldTile = BoardManager.Instance.GetTile(previousPosition);
        oldTile?.RemoveOccupant(explorerId);

        TileData newTile = BoardManager.Instance.GetTile(targetPosition);
        newTile?.AddOccupant(explorerId);

        StartCoroutine(controller.MoveTo(targetPosition));
    }

    /// <summary>
    /// Sets the render mode (3D model or 2D token) for all active explorers.
    /// </summary>
    /// <param name="is3D">True to show 3D models; false to show 2D tokens.</param>
    public void SetAllRenderMode(bool is3D)
    {
        foreach (var controller in _explorers.Values)
            controller.ApplyRenderMode(is3D);
    }

    /// <summary>
    /// Destroys the explorer's GameObject and removes it from the manager.
    /// </summary>
    /// <param name="explorerId">The unique identifier of the explorer to remove.</param>
    public void RemoveExplorer(string explorerId)
    {
        if (_explorers.TryGetValue(explorerId, out ExplorerController controller))
        {
            Destroy(controller.gameObject);
            _explorers.Remove(explorerId);
        }
    }
}
