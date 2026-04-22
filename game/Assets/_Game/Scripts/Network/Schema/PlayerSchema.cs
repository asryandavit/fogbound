// Generated schema — mirrors backend/src/colyseus/schemas/PlayerSchema.ts

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class PlayerSchema : Schema
{
#if UNITY_5_3_OR_NEWER
    [Preserve]
#endif
    public PlayerSchema() { }

    [Type(0, "string")]  public string playerId    = default;
    [Type(1, "string")]  public string username    = default;
    [Type(2, "number")]  public float  score       = 0;
    [Type(3, "boolean")] public bool   isBot       = false;
    [Type(4, "boolean")] public bool   isConnected = false;
    [Type(5, "number")]  public float  slotNumber  = 0;
    [Type(6, "string")]  public string teamColor   = default;
    [Type(7, "number")]  public float  baseX       = 0;
    [Type(8, "number")]  public float  baseY       = 0;
}
