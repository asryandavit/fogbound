using System.Collections.Generic;
using System.Threading.Tasks;
using Colyseus;
using UnityEngine;

public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }

    [SerializeField] private string serverUrl = "ws://localhost:4567";
    [SerializeField] private string roomName  = "fogbound_room";

    private Client _client;
    private Room<FogboundState> _room;
    private bool _isConnected;
    private string _playerId;
    private string _authToken;

    public bool IsConnected   => _isConnected;
    public bool IsServerMode  => _isConnected;
    public string PlayerId    => _playerId;

    [System.Serializable]
    private class BotControlMessage { public string playerId; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);
        Instance = this;
    }

    /// <summary>
    /// Stores auth credentials and creates the Colyseus client.
    /// Must be called before ConnectToRoom.
    /// </summary>
    public void Initialize(string authToken, string playerId)
    {
        _authToken = authToken;
        _playerId  = playerId;
        _client    = new Client(serverUrl);
    }

    /// <summary>
    /// Joins or creates a fogbound_room. On success wires schema sync to GameStateSync.
    /// </summary>
    public async Task ConnectToRoom(string mapId)
    {
        if (_client == null)
        {
            Debug.LogError("[Network] Call Initialize() before ConnectToRoom().");
            return;
        }

        try
        {
            var options = new Dictionary<string, object>
            {
                { "token",    _authToken },
                { "playerId", _playerId },
                { "mapId",    mapId }
            };

            _room = await _client.JoinOrCreate<FogboundState>(roomName, options);
            _isConnected = true;

            Debug.Log($"[Network] Connected to room {_room.RoomId}");

            // Tell InputManager which player we are
            InputManager.Instance?.SetLocalPlayer(_playerId);

            SetupRoomListeners();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[Network] Failed to connect: {e.Message}");
            _isConnected = false;
        }
    }

    /// <summary>
    /// Sends a move_explorer message to the server.
    /// Does nothing if not connected.
    /// </summary>
    public async Task SendMoveExplorer(string explorerId, int targetX, int targetY)
    {
        if (!_isConnected || _room == null) return;

        var payload = new Dictionary<string, object>
        {
            { "explorerId", explorerId },
            { "targetX",    targetX },
            { "targetY",    targetY }
        };
        await _room.Send("move_explorer", payload);
    }

    /// <summary>
    /// Sends an end_turn message to the server.
    /// </summary>
    public async Task SendEndTurn()
    {
        if (!_isConnected || _room == null) return;
        await _room.Send("end_turn", new { });
    }

    /// <summary>
    /// Leaves the current room gracefully.
    /// </summary>
    public async Task Disconnect()
    {
        if (_room != null)
            await _room.Leave();
        _isConnected = false;
        Debug.Log("[Network] Disconnected");
    }

    private async void OnDestroy()
    {
        if (_room != null)
            await _room.Leave();
    }

    private void SetupRoomListeners()
    {
        _room.OnLeave += (code) =>
        {
            Debug.Log($"[Network] Left room ({code})");
            _isConnected = false;
        };

        _room.OnError += (code, message) =>
        {
            Debug.LogError($"[Network] Room error {code}: {message}");
        };

        _room.OnMessage<BotControlMessage>("player_afk_bot_controlling", (msg) =>
        {
            Debug.Log($"[Network] {msg.playerId} is now bot-controlled");
            if (ExplorerManager.Instance == null) return;
            foreach (var explorer in ExplorerManager.Instance.GetPlayerExplorers(msg.playerId))
                explorer.ShowBotBadge(true);
        });

        // Delegate all schema delta sync to GameStateSync
        GameStateSync.Instance?.SetRoom(_room);
    }
}
