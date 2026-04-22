// Generated schema — mirrors backend/src/colyseus/schemas/TileSchema.ts

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class TileSchema : Schema
{
#if UNITY_5_3_OR_NEWER
    [Preserve]
#endif
    public TileSchema() { }

    [Type(0, "number")]  public float  x              = 0;
    [Type(1, "number")]  public float  y              = 0;
    [Type(2, "string")]  public string tileType       = default;
    [Type(3, "boolean")] public bool   isRevealed     = false;
    [Type(4, "string")]  public string treasureType   = default;
    [Type(5, "number")]  public float  treasureValue  = 0;
    [Type(6, "boolean")] public bool   isOccupied     = false;
}
