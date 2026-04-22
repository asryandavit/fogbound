// Generated schema — mirrors backend/src/colyseus/schemas/FogboundState.ts
// Index order MUST match @type() decorator order in TypeScript.

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class FogboundState : Schema
{
#if UNITY_5_3_OR_NEWER
    [Preserve]
#endif
    public FogboundState() { }

    [Type(0, "string")]  public string matchId        = default;
    [Type(1, "string")]  public string status         = default;
    [Type(2, "string")]  public string winCondition   = default;
    [Type(3, "number")]  public float  turnTimerSeconds = 0;

    [Type(4, "map", typeof(MapSchema<TileSchema>))]
    public MapSchema<TileSchema> tiles = null;

    [Type(5, "map", typeof(MapSchema<ExplorerSchema>))]
    public MapSchema<ExplorerSchema> explorers = null;

    [Type(6, "map", typeof(MapSchema<PlayerSchema>))]
    public MapSchema<PlayerSchema> players = null;

    [Type(7, "ref", typeof(TurnStateSchema))]
    public TurnStateSchema turnState = null;
}
