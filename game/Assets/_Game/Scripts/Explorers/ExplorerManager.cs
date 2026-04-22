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
            Destroy(Instance.gameObject);
        Instance = this;
    }

    /// <summary>
    /// Spawns a new explorer, initializes it with data and team color, and registers it.
    /// </summary>
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
    /// Returns the ExplorerController for the given ID, or null if not found.
    /// </summary>
    public ExplorerController GetExplorer(string explorerId)
    {
        _explorers.TryGetValue(explorerId, out ExplorerController controller);
        return controller;
    }

    /// <summary>
    /// Returns all explorers belonging to a specific player.
    /// </summary>
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
    /// Local move: validates move count and applies to board. Used in offline mode.
    /// </summary>
    public void MoveExplorer(string explorerId, Vector2Int targetPosition)
    {
        ExplorerController controller = GetExplorer(explorerId);
        if (controller == null) return;

        ExplorerData data = controller.ExplorerData;
        if (!data.CanMove()) return;

        Vector2Int previousPosition = data.gridPosition;
        data.UseMove();

        TileData oldTile = BoardManager.Instance.GetTile(previousPosition);
        oldTile?.RemoveOccupant(explorerId);

        TileData newTile = BoardManager.Instance.GetTile(targetPosition);
        newTile?.AddOccupant(explorerId);

        StartCoroutine(controller.MoveTo(targetPosition));
    }

    /// <summary>
    /// Server-authoritative move: bypasses move-count validation and teleports directly.
    /// Called by GameStateSync when the server sends a position delta.
    /// </summary>
    public void ServerMoveExplorer(string explorerId, Vector2Int targetPosition)
    {
        ExplorerController controller = GetExplorer(explorerId);
        if (controller == null) return;

        Vector2Int previousPosition = controller.ExplorerData.gridPosition;
        if (previousPosition == targetPosition) return;

        TileData oldTile = BoardManager.Instance?.GetTile(previousPosition);
        oldTile?.RemoveOccupant(explorerId);

        TileData newTile = BoardManager.Instance?.GetTile(targetPosition);
        newTile?.AddOccupant(explorerId);

        StartCoroutine(controller.MoveTo(targetPosition));
    }

    /// <summary>
    /// Destroys all active explorer GameObjects and clears the registry.
    /// Called by GameStateSync before applying the first server state.
    /// </summary>
    public void ClearAllExplorers()
    {
        foreach (var controller in _explorers.Values)
        {
            if (controller != null)
                Destroy(controller.gameObject);
        }
        _explorers.Clear();
    }

    /// <summary>
    /// Switches all explorers between 3D model and 2D token rendering.
    /// </summary>
    public void SetAllRenderMode(bool is3D)
    {
        foreach (var controller in _explorers.Values)
            controller.ApplyRenderMode(is3D);
    }

    /// <summary>
    /// Destroys one explorer's GameObject and removes it from the manager.
    /// </summary>
    public void RemoveExplorer(string explorerId)
    {
        if (_explorers.TryGetValue(explorerId, out ExplorerController controller))
        {
            Destroy(controller.gameObject);
            _explorers.Remove(explorerId);
        }
    }
}
