using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GameInitializer : MonoBehaviour
{
    [SerializeField] private Vector2Int testBoardSize = new Vector2Int(13, 13);
    [SerializeField] private int testPlayerCount = 2;
    [SerializeField] private bool autoStartOnPlay = true;

    private bool _isInitialized;

    public bool IsInitialized => _isInitialized;

    private void Start()
    {
        if (autoStartOnPlay)
            StartCoroutine(InitializeGame());
    }

    /// <summary>
    /// Coroutine that sequentially initializes all game systems:
    /// board, fog, camera, explorers, turn manager, local player, and game state.
    /// </summary>
    public IEnumerator InitializeGame()
    {
        Debug.Log("Initializing game...");

        // Step 1 - Initialize board
        BoardManager.Instance.InitializeBoard(testBoardSize);
        Debug.Log("Board initialized");
        yield return null;

        // Step 2 - Initialize fog
        FogOfWarManager.Instance.InitializeFog(testBoardSize);
        Debug.Log("Fog initialized");
        yield return null;

        // Step 3 - Set camera
        Vector3 boardCenter = new Vector3(
            testBoardSize.x / 2f - 0.5f,
            testBoardSize.y / 2f - 0.5f,
            -10f);
        GameObject mainCameraGO = GameObject.Find("Main Camera");
        CameraController cameraController = mainCameraGO.GetComponent<CameraController>();
        cameraController.SetBoardCenter(boardCenter);
        Debug.Log("Camera set");
        yield return null;

        // Step 4 - Spawn test explorers
        // Starting rows revealed inside SpawnTestExplorers
        SpawnTestExplorers();
        Debug.Log("Explorers spawned");
        yield return null;

        // Step 5 - Initialize turn manager
        List<string> playerIds = new List<string>();
        for (int i = 1; i <= testPlayerCount; i++)
            playerIds.Add($"player_{i}");
        TurnManager.Instance.InitializePlayers(playerIds);
        TurnManager.Instance.StartTurn();
        Debug.Log("Turn manager initialized");
        yield return null;

        // Step 6 - Set local player
        InputManager.Instance.SetLocalPlayer("player_1");
        Debug.Log("Local player set");

        // Step 7 - Start game
        GameManager.Instance.StartGame();
        _isInitialized = true;
        Debug.Log("Game initialized successfully");
    }

    /// <summary>
    /// Spawns test explorers for 2 players on opposite sides of the board.
    /// Reveals entire starting rows and places 2 explorers per player at their base positions.
    /// </summary>
    private void SpawnTestExplorers()
    {
        int boardWidth = testBoardSize.x;
        int boardHeight = testBoardSize.y;

        // Reveal entire bottom row for player 1
        for (int x = 0; x < boardWidth; x++)
            FogOfWarManager.Instance.RevealTile(new Vector2Int(x, 0));

        // Reveal entire top row for player 2
        for (int x = 0; x < boardWidth; x++)
            FogOfWarManager.Instance.RevealTile(new Vector2Int(x, boardHeight - 1));

        // Player 1 base at center-left of bottom row
        int p1BaseX = boardWidth / 2 - 1;
        Vector2Int p1Base = new Vector2Int(p1BaseX, 0);

        // Player 2 base at center of top row
        int p2BaseX = boardWidth / 2 + 1;
        Vector2Int p2Base = new Vector2Int(p2BaseX, boardHeight - 1);

        // Spawn 2 explorers per player (medium map 13x13)
        // Explorers start at base position
        ExplorerManager.Instance.SpawnExplorer(
            "explorer_1_1", "player_1", 0, p1Base);
        ExplorerManager.Instance.SpawnExplorer(
            "explorer_1_2", "player_1", 0,
            new Vector2Int(p1BaseX + 1, 0));

        ExplorerManager.Instance.SpawnExplorer(
            "explorer_2_1", "player_2", 1, p2Base);
        ExplorerManager.Instance.SpawnExplorer(
            "explorer_2_2", "player_2", 1,
            new Vector2Int(p2BaseX - 1, boardHeight - 1));
    }
}
