// Generated schema — mirrors backend/src/colyseus/schemas/TurnStateSchema.ts

using Colyseus.Schema;
#if UNITY_5_3_OR_NEWER
using UnityEngine.Scripting;
#endif

public partial class TurnStateSchema : Schema
{
#if UNITY_5_3_OR_NEWER
    [Preserve]
#endif
    public TurnStateSchema() { }

    [Type(0, "string")] public string currentPlayerId = default;
    [Type(1, "number")] public float  turnNumber      = 0;
    [Type(2, "string")] public string phase           = default;
}
