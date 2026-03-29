using System.Collections.Generic;
using UnityEngine;

public class FogOfWarManager : MonoBehaviour
{
    public static FogOfWarManager Instance { get; private set; }

    [SerializeField] private Color fogColor = Color.black;
    [SerializeField] private Color revealedColor = Color.white;
    [SerializeField] private Transform fogParent;

    private HashSet<Vector2Int> _revealedTiles;
    private Dictionary<Vector2Int, GameObject> _fogObjects;

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
    /// Initializes fog of war for the entire board, creating a fog overlay object for every tile position.
    /// </summary>
    /// <param name="boardSize">The dimensions of the board in tiles.</param>
    public void InitializeFog(Vector2Int boardSize)
    {
        _revealedTiles = new HashSet<Vector2Int>();
        _fogObjects = new Dictionary<Vector2Int, GameObject>();

        for (int x = 0; x < boardSize.x; x++)
        {
            for (int y = 0; y < boardSize.y; y++)
            {
                CreateFogObject(new Vector2Int(x, y));
            }
        }
    }

    /// <summary>
    /// Reveals the fog at the given tile position. Has no effect if the tile is already revealed.
    /// Also notifies BoardManager to reveal the underlying tile data.
    /// </summary>
    /// <param name="position">The grid position of the tile to reveal.</param>
    public void RevealTile(Vector2Int position)
    {
        if (_revealedTiles.Contains(position))
            return;

        _revealedTiles.Add(position);
        HideFogObject(position);
        BoardManager.Instance.RevealTile(position);
    }

    /// <summary>
    /// Reveals all tiles within a Manhattan distance radius from the center position.
    /// </summary>
    /// <param name="center">The center grid position of the reveal area.</param>
    /// <param name="radius">The Manhattan distance radius to reveal.</param>
    public void RevealArea(Vector2Int center, int radius)
    {
        for (int x = center.x - radius; x <= center.x + radius; x++)
        {
            for (int y = center.y - radius; y <= center.y + radius; y++)
            {
                if (Mathf.Abs(x - center.x) + Mathf.Abs(y - center.y) <= radius)
                    RevealTile(new Vector2Int(x, y));
            }
        }
    }

    /// <summary>
    /// Returns true if the tile at the given position has been revealed.
    /// </summary>
    /// <param name="position">The grid position to check.</param>
    public bool IsTileRevealed(Vector2Int position)
    {
        return _revealedTiles.Contains(position);
    }

    private void CreateFogObject(Vector2Int position)
    {
        // TODO: replace with proper fog sprite
        float tileSize = BoardManager.Instance != null ? 1f : 1f;
        Vector3 worldPosition = new Vector3(position.x * tileSize, position.y * tileSize, -0.1f);

        GameObject fog = GameObject.CreatePrimitive(PrimitiveType.Quad);
        fog.transform.position = worldPosition;
        fog.transform.SetParent(fogParent != null ? fogParent : transform);
        fog.name = $"Fog_{position.x}_{position.y}";

        Renderer renderer = fog.GetComponent<Renderer>();
        if (renderer != null)
        {
            Material fogMaterial = new Material(Shader.Find("Sprites/Default"));
            fogMaterial.color = new Color(0.1f, 0.1f, 0.1f, 1f);
            renderer.material = fogMaterial;
        }

        _fogObjects[position] = fog;
    }

    private void HideFogObject(Vector2Int position)
    {
        if (_fogObjects.TryGetValue(position, out GameObject fogObject))
            fogObject.SetActive(false);
    }
}
