// Generated schema — mirrors backend/src/colyseus/schemas/ExplorerSchema.ts

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class ExplorerSchema : Schema
{
#if UNITY_5_3_OR_NEWER
    [Preserve]
#endif
    public ExplorerSchema() { }

    [Type(0,  "string")]  public string explorerId   = default;
    [Type(1,  "string")]  public string playerId     = default;
    [Type(2,  "number")]  public float  x            = 0;
    [Type(3,  "number")]  public float  y            = 0;
    [Type(4,  "string")]  public string state        = default;
    [Type(5,  "number")]  public float  score        = 0;
    [Type(6,  "number")]  public float  coinCount    = 0;
    [Type(7,  "boolean")] public bool   hasBag       = false;
    [Type(8,  "boolean")] public bool   hasBoat      = false;
    [Type(9,  "boolean")] public bool   hasShield    = false;
    [Type(10, "boolean")] public bool   isBot        = false;
    [Type(11, "number")]  public float  botMoveCount = 0;
}
