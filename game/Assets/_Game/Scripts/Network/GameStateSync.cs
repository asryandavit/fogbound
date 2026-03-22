using System.Collections.Generic;
using UnityEngine;

public class GameStateSync : MonoBehaviour
{
    public static GameStateSync Instance { get; private set; }

    [System.Serializable]
    public class ServerTileState
    {
        public int x;
        public int y;
        public string tileType;
        public bool isRevealed;
        public string treasureType;
        public int treasureValue;
    }

    [System.Serializable]
    public class ServerExplorerState
    {
        public string explorerId;
        public string playerId;
        public int x;
        public int y;
        public string state;
        public int score;
    }

    [System.Serializable]
    public class ServerPlayerState
    {
        public string playerId;
        public string username;
        public int score;
        public bool isBot;
        public bool isConnected;
    }

    [System.Serializable]
    public class ServerGameState
    {
        public string matchId;
        public string status;
        public int currentTurn;
        public string currentPlayerId;
        public List<ServerTileState> tiles;
        public List<ServerExplorerState> explorers;
        public List<ServerPlayerState> players;
    }

    private ServerGameState _lastState;

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
    /// Deserializes a JSON game state string from the server and applies it to all Unity systems.
    /// </summary>
    /// <param name="jsonState">The JSON-encoded ServerGameState received from the Colyseus server.</param>
    public void ApplyState(string jsonState)
    {
        ServerGameState state = JsonUtility.FromJson<ServerGameState>(jsonState);
        _lastState = state;

        ApplyTiles(state.tiles);
        ApplyExplorers(state.explorers);
        ApplyPlayers(state.players);

        GameManager.Instance.SetCurrentPlayer(state.currentPlayerId);
    }

    /// <summary>
    /// Returns the last server game state that was applied.
    /// </summary>
    public ServerGameState GetLastState()
    {
        return _lastState;
    }

    private void ApplyTiles(List<ServerTileState> tiles)
    {
        if (tiles == null)
            return;

        foreach (ServerTileState serverTile in tiles)
        {
            Vector2Int position = new Vector2Int(serverTile.x, serverTile.y);
            TileData tile = BoardManager.Instance.GetTile(position);
            if (tile == null)
                continue;

            if (serverTile.isRevealed)
                FogOfWarManager.Instance.RevealTile(position);
        }
    }

    private void ApplyExplorers(List<ServerExplorerState> explorers)
    {
        if (explorers == null)
            return;

        foreach (ServerExplorerState serverExplorer in explorers)
        {
            ExplorerController controller = ExplorerManager.Instance.GetExplorer(serverExplorer.explorerId);
            if (controller == null)
                continue;

            Vector2Int serverPosition = new Vector2Int(serverExplorer.x, serverExplorer.y);
            if (controller.ExplorerData.gridPosition != serverPosition)
                ExplorerManager.Instance.MoveExplorer(serverExplorer.explorerId, serverPosition);
        }
    }

    private void ApplyPlayers(List<ServerPlayerState> players)
    {
        // TODO: update player UI scores and connection status
    }
}
