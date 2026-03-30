using System.Collections.Generic;
using System.Threading.Tasks;
using Colyseus;
using UnityEngine;

public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }

    [SerializeField] private string serverUrl = "ws://localhost:2567";
    [SerializeField] private string roomName = "game_room";

    private Client _client;
    private Room<NoState> _room;
    private bool _isConnected;
    private string _playerId;
    private string _authToken;

    public bool IsConnected => _isConnected;
    public string PlayerId => _playerId;

    private void Awake()
    {
        if (Instance != null && Instance != this)
            Destroy(Instance.gameObject);

        Instance = this;
    }

    /// <summary>
    /// Stores the player's auth token and ID, and creates the Colyseus client.
    /// Call this before connecting to a room.
    /// </summary>
    /// <param name="authToken">The authenticated player's token.</param>
    /// <param name="playerId">The authenticated player's unique identifier.</param>
    public void Initialize(string authToken, string playerId)
    {
        _authToken = authToken;
        _playerId = playerId;
        _client = new Client(serverUrl);
    }

    /// <summary>
    /// Asynchronously joins or creates a game room on the Colyseus server for the given map.
    /// </summary>
    /// <param name="mapId">The identifier of the map/session to join or create.</param>
    public async Task ConnectToRoom(string mapId)
    {
        try
        {
            Dictionary<string, object> options = new Dictionary<string, object>
            {
                { "token", _authToken },
                { "playerId", _playerId },
                { "mapId", mapId }
            };

            _room = await _client.JoinOrCreate(roomName, options);
            _isConnected = true;
            SetupRoomListeners();
            Debug.Log("Connected to room");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to connect to room: {e.Message}");
            _isConnected = false;
        }
    }

    /// <summary>
    /// Asynchronously leaves the current room and marks the client as disconnected.
    /// </summary>
    public async Task Disconnect()
    {
        if (_room != null)
            await _room.Leave();

        _isConnected = false;
        Debug.Log("Disconnected from room");
    }

    /// <summary>
    /// Sends a game action message with the given type and payload to the server.
    /// Does nothing if not currently connected.
    /// </summary>
    /// <param name="actionType">The message type identifier.</param>
    /// <param name="payload">The data payload to send alongside the action.</param>
    public async Task SendAction(string actionType, object payload)
    {
        if (!_isConnected)
            return;

        await _room.Send(actionType, payload);
    }

    /// <summary>
    /// Attempts to reconnect to the server by joining or creating a room again.
    /// </summary>
    public async Task Reconnect()
    {
        Debug.Log("Attempting reconnect");
        // TODO: store and reuse last mapId
        await ConnectToRoom(string.Empty);
    }

    private void SetupRoomListeners()
    {
        // TODO: wire up to GameStateSync
        _room.OnMessage<object>("state_update", (message) =>
        {
            Debug.Log($"state_update received: {message}");
        });

        _room.OnLeave += (code) =>
        {
            Debug.Log($"Left room with code: {code}");
            _isConnected = false;
        };

        _room.OnError += (code, message) =>
        {
            Debug.LogError($"Room error {code}: {message}");
        };
    }
}
