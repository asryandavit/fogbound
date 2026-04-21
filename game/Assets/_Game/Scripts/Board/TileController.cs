using UnityEngine;

public class TileController : MonoBehaviour
{
    [SerializeField] private Sprite fogSprite;
    [SerializeField] private Sprite grassSprite;
    [SerializeField] private Sprite jungleSprite;
    [SerializeField] private Sprite sandSprite;
    [SerializeField] private Sprite waterSprite;
    [SerializeField] private Sprite iceSprite;
    [SerializeField] private Sprite desertSprite;
    [SerializeField] private Color selectedColor = Color.yellow;
    [SerializeField] private Color normalColor = Color.white;

    private TileData _tileData;
    private SpriteRenderer _spriteRenderer;
    private bool _isSelected;

    public TileData TileData => _tileData;

    private void Awake()
    {
        _spriteRenderer = GetComponent<SpriteRenderer>();
    }

    /// <summary>
    /// Initializes the tile controller with the given TileData and refreshes the visual.
    /// </summary>
    /// <param name="data">The tile's runtime data.</param>
    public void Initialize(TileData data)
    {
        _tileData = data;
        UpdateVisual();
    }

    /// <summary>
    /// Updates the tile's sprite and color to reflect its current data state.
    /// Unrevealed tiles show the fog sprite; revealed tiles show their terrain sprite.
    /// </summary>
    public void UpdateVisual()
    {
        if (_spriteRenderer == null)
            _spriteRenderer = GetComponent<SpriteRenderer>();
        if (_spriteRenderer == null) return;

        if (!_tileData.isRevealed)
        {
            _spriteRenderer.sprite = fogSprite;
            if (_spriteRenderer.sprite == null)
            {
                Texture2D tex = new Texture2D(1, 1);
                tex.SetPixel(0, 0, Color.white);
                tex.Apply();
                _spriteRenderer.sprite = Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
            }
            _spriteRenderer.color = new Color(0.1f, 0.1f, 0.1f, 1f);
            return;
        }

        switch (_tileData.terrainType)
        {
            case TerrainType.Grass:   _spriteRenderer.sprite = grassSprite;   break;
            case TerrainType.Jungle:  _spriteRenderer.sprite = jungleSprite;  break;
            case TerrainType.Sand:    _spriteRenderer.sprite = sandSprite;    break;
            case TerrainType.Water:   _spriteRenderer.sprite = waterSprite;   break;
            case TerrainType.Ice:     _spriteRenderer.sprite = iceSprite;     break;
            case TerrainType.Desert:  _spriteRenderer.sprite = desertSprite;  break;
            default:                  _spriteRenderer.sprite = grassSprite;   break;
        }

        // If no sprite assigned on prefab, create a 1x1 white sprite so color is visible.
        // pixelsPerUnit=1 so the 1px texture maps to 1 world unit, filling the tile.
        if (_spriteRenderer.sprite == null)
        {
            Texture2D tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.Apply();
            _spriteRenderer.sprite = Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }

        _spriteRenderer.color = GetTerrainColor(_tileData.terrainType);
    }

    /// <summary>
    /// Returns the display color for the given terrain type.
    /// </summary>
    private Color GetTerrainColor(TerrainType terrain)
    {
        return terrain switch
        {
            TerrainType.Grass  => new Color(0.5f, 0.8f, 0.4f, 1f),
            TerrainType.Jungle => new Color(0.2f, 0.5f, 0.2f, 1f),
            TerrainType.Sand   => new Color(0.9f, 0.8f, 0.5f, 1f),
            TerrainType.Water  => new Color(0.2f, 0.5f, 0.8f, 1f),
            TerrainType.Ice    => new Color(0.7f, 0.9f, 1.0f, 1f),
            TerrainType.Desert => new Color(0.9f, 0.6f, 0.3f, 1f),
            _                  => Color.white
        };
    }

    /// <summary>
    /// Marks this tile as selected or deselected, updating its highlight color accordingly.
    /// </summary>
    /// <param name="selected">True to highlight the tile; false to restore normal color.</param>
    public void SetSelected(bool selected)
    {
        _isSelected = selected;
        _spriteRenderer.color = _isSelected ? selectedColor : normalColor;
    }

    private void OnMouseDown()
    {
        InputManager.Instance.OnTileClicked(_tileData.gridPosition);
        // TODO: wire up to input system
    }
}
