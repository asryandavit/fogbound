using System.Collections.Generic;
using Colyseus;
using Colyseus.Schema;
using UnityEngine;

public class GameStateSync : MonoBehaviour
{
    public static GameStateSync Instance { get; private set; }

    private Room<FogboundState> _room;
    private readonly Dictionary<string, int> _playerSlots = new Dictionary<string, int>();
    private readonly List<string>            _playerIds   = new List<string>();
    private bool _serverExplorersReceived;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);
        Instance = this;
    }

    /// <summary>
    /// Wires all Colyseus schema delta callbacks. Call this immediately after room join.
    /// </summary>
    public void SetRoom(Room<FogboundState> room)
    {
        _room = room;
        var state     = room.State;
        var callbacks = Callbacks.Get(room);

        // ── Players ──────────────────────────────────────────────────────────
        callbacks.OnAdd(s => s.players, (key, player) =>
        {
            if (!_playerSlots.ContainsKey(key))
                _playerSlots[key] = (int)player.slotNumber;

            if (!_playerIds.Contains(key))
            {
                _playerIds.Add(key);
                TurnManager.Instance?.InitializePlayers(new List<string>(_playerIds));
            }
        });

        // ── Explorers ─────────────────────────────────────────────────────────
        callbacks.OnAdd(s => s.explorers, (key, explorer) =>
        {
            // On first server explorer — clear the local prototype explorers from GameInitializer
            if (!_serverExplorersReceived)
            {
                _serverExplorersReceived = true;
                ExplorerManager.Instance?.ClearAllExplorers();
            }

            int  slot = _playerSlots.TryGetValue(explorer.playerId, out int s2) ? s2 : 0;
            var  pos  = new Vector2Int((int)explorer.x, (int)explorer.y);

            if (ExplorerManager.Instance?.GetExplorer(explorer.explorerId) == null)
                ExplorerManager.Instance?.SpawnExplorer(explorer.explorerId, explorer.playerId, slot, pos);

            // Watch position — fire on either axis change
            callbacks.Listen(explorer, e => e.x, (_, __) => SyncExplorerPos(explorer));
            callbacks.Listen(explorer, e => e.y, (_, __) => SyncExplorerPos(explorer));
        });

        // ── Tiles ─────────────────────────────────────────────────────────────
        callbacks.OnAdd(s => s.tiles, (key, tile) =>
        {
            // Sync initial revealed state
            if (tile.isRevealed)
                FogOfWarManager.Instance?.RevealTile(new Vector2Int((int)tile.x, (int)tile.y));

            callbacks.Listen(tile, t => t.isRevealed, (isRevealed, _) =>
            {
                if (isRevealed)
                    FogOfWarManager.Instance?.RevealTile(new Vector2Int((int)tile.x, (int)tile.y));
            });
        });

        // ── Turn state ────────────────────────────────────────────────────────
        // Use broad OnChange on root state; handler is cheap and idempotent.
        callbacks.OnChange(state, () => ApplyTurnState(state));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void SyncExplorerPos(ExplorerSchema explorer)
    {
        var pos = new Vector2Int((int)explorer.x, (int)explorer.y);
        ExplorerManager.Instance?.ServerMoveExplorer(explorer.explorerId, pos);
    }

    private static void ApplyTurnState(FogboundState state)
    {
        if (state.turnState == null) return;
        if (string.IsNullOrEmpty(state.turnState.currentPlayerId)) return;
        TurnManager.Instance?.ApplyServerTurnState(
            state.turnState.currentPlayerId,
            (int)state.turnState.turnNumber);
    }
}
