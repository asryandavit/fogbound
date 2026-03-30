using System.Collections.Generic;
using UnityEngine;

public class BoardManager : MonoBehaviour
{
    public static BoardManager Instance { get; private set; }

    [SerializeField] private GameObject tilePrefab;
    [SerializeField] private float tileSize = 1.0f;
    [SerializeField] private Transform boardParent;

    private TileData[,] _tiles;
    private Dictionary<Vector2Int, GameObject> _tileObjects = new Dictionary<Vector2Int, GameObject>();
    private Vector2Int _boardSize;

    public Vector2Int BoardSize => _boardSize;
    public TileData[,] Tiles => _tiles;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);

        Instance = this;
    }

    /// <summary>
    /// Initializes the board with the given size, creating TileData and spawning tile objects for every position.
    /// </summary>
    /// <param name="size">The width (x) and height (y) of the board in tiles.</param>
    public void InitializeBoard(Vector2Int size)
    {
        _boardSize = size;
        _tiles = new TileData[size.x, size.y];

        for (int x = 0; x < size.x; x++)
        {
            for (int y = 0; y < size.y; y++)
            {
                var position = new Vector2Int(x, y);
                _tiles[x, y] = new TileData(position);
                SpawnTileObject(position);
            }
        }
    }

    /// <summary>
    /// Returns the TileData at the given grid position, or null if the position is out of bounds.
    /// </summary>
    /// <param name="position">The grid position to query.</param>
    public TileData GetTile(Vector2Int position)
    {
        if (!IsValidPosition(position))
            return null;
        return _tiles[position.x, position.y];
    }

    /// <summary>
    /// Returns the TileData at the given grid coordinates, or null if out of bounds.
    /// </summary>
    /// <param name="x">The x grid coordinate.</param>
    /// <param name="y">The y grid coordinate.</param>
    public TileData GetTile(int x, int y)
    {
        return GetTile(new Vector2Int(x, y));
    }

    /// <summary>
    /// Reveals the tile at the given position and updates its visual representation.
    /// </summary>
    /// <param name="position">The grid position of the tile to reveal.</param>
    public void RevealTile(Vector2Int position)
    {
        TileData tile = GetTile(position);
        if (tile == null)
            return;

        tile.Reveal();
        UpdateTileVisual(position);
    }

    /// <summary>
    /// Returns true if the given grid position is within the board bounds.
    /// </summary>
    /// <param name="position">The grid position to validate.</param>
    public bool IsValidPosition(Vector2Int position)
    {
        return position.x >= 0 && position.x < _boardSize.x &&
               position.y >= 0 && position.y < _boardSize.y;
    }

    /// <summary>
    /// Returns a list of valid orthogonal (up, down, left, right) neighboring tiles for the given position.
    /// </summary>
    /// <param name="position">The grid position whose neighbors to retrieve.</param>
    public List<TileData> GetNeighbors(Vector2Int position)
    {
        var neighbors = new List<TileData>();
        var directions = new Vector2Int[]
        {
            new Vector2Int(0, 1),
            new Vector2Int(0, -1),
            new Vector2Int(-1, 0),
            new Vector2Int(1, 0)
        };

        foreach (var dir in directions)
        {
            var neighbor = GetTile(position + dir);
            if (neighbor != null)
                neighbors.Add(neighbor);
        }

        return neighbors;
    }

    private void SpawnTileObject(Vector2Int position)
    {
        float worldX = position.x * tileSize;
        float worldY = position.y * tileSize;
        Vector3 worldPosition = new Vector3(worldX, worldY, 0f);

        GameObject tileObject = Instantiate(tilePrefab, worldPosition, Quaternion.identity, boardParent);
        tileObject.name = $"Tile_{position.x}_{position.y}";

        // Scale tile to 0.95 so camera background (dark gray) shows through as grid lines
        tileObject.transform.localScale = new Vector3(0.95f, 0.95f, 1f);

        // Initialize the TileController with this tile's data
        TileController controller = tileObject.GetComponent<TileController>();
        if (controller != null)
            controller.Initialize(_tiles[position.x, position.y]);

        _tileObjects[position] = tileObject;
    }

    /// <summary>
    /// Returns the TileController component for the tile GameObject at the given grid position,
    /// or null if the position has no tile object or no TileController.
    /// </summary>
    /// <param name="position">The grid position to look up.</param>
    public TileController GetTileController(Vector2Int position)
    {
        if (!_tileObjects.TryGetValue(position, out GameObject tileObject))
            return null;
        return tileObject.GetComponent<TileController>();
    }

    private void UpdateTileVisual(Vector2Int position)
    {
        TileController tc = GetTileController(position);
        tc?.UpdateVisual();
    }
}
