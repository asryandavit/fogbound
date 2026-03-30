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
    /// All steps run in a single frame to avoid Unity License thread GC issues.
    /// </summary>
    public IEnumerator InitializeGame()
    {
        Debug.Log("Initializing game...");

        // Step 1 - Initialize board
        BoardManager.Instance.InitializeBoard(testBoardSize);
        Debug.Log("Board initialized");

        // Step 2 - Initialize fog
        FogOfWarManager.Instance.InitializeFog(testBoardSize);
        Debug.Log("Fog initialized");

        // Step 3 - Set camera
        Vector3 boardCenter = new Vector3(
            testBoardSize.x / 2f - 0.5f,
            testBoardSize.y / 2f - 0.5f,
            -15f);
        GameObject mainCameraGO = GameObject.Find("Main Camera");
        if (mainCameraGO == null)
        {
            Debug.LogError("Main Camera GameObject not found!");
            yield break;
        }
        CameraController cameraController = mainCameraGO.GetComponent<CameraController>();
        if (cameraController == null)
        {
            Debug.LogError("CameraController component not found on Main Camera!");
            yield break;
        }
        cameraController.SetBoardCenter(boardCenter);
        Debug.Log("Camera set");

        // Step 4 - Spawn test explorers
        SpawnTestExplorers();
        Debug.Log("Explorers spawned");

        // Step 5 - Initialize turn manager
        List<string> playerIds = new List<string>();
        for (int i = 1; i <= testPlayerCount; i++)
            playerIds.Add($"player_{i}");
        TurnManager.Instance.InitializePlayers(playerIds);
        TurnManager.Instance.StartTurn();
        Debug.Log("Turn manager initialized");

        // Step 6 - Set local player
        InputManager.Instance.SetLocalPlayer("player_1");
        Debug.Log("Local player set");

        // Step 7 - Start game
        GameManager.Instance.StartGame();
        _isInitialized = true;
        Debug.Log("Game initialized successfully");

        // Single yield at the end — all init runs in Frame 1 to avoid
        // Unity 6 License thread finalizer crashing play mode between yields.
        yield return null;
    }

    /// <summary>
    /// Spawns test explorers for 2 players on opposite sides of the board.
    /// Reveals entire starting rows and places 2 explorers per player at their base positions.
    /// </summary>
    private void SpawnTestExplorers()
    {
        int boardWidth = testBoardSize.x;
        int boardHeight = testBoardSize.y;

        // Reveal entire bottom row for player 1 and assign Grass terrain
        for (int x = 0; x < boardWidth; x++)
        {
            TileData bottomTile = BoardManager.Instance.GetTile(x, 0);
            if (bottomTile != null)
            {
                bottomTile.terrainType = TerrainType.Grass;
                bottomTile.tileType = TileType.Grass;
                bottomTile.isRevealed = true;
            }
            FogOfWarManager.Instance.RevealTile(new Vector2Int(x, 0));
            TileController bottomTc = BoardManager.Instance.GetTileController(new Vector2Int(x, 0));
            bottomTc?.UpdateVisual();
        }

        // Reveal entire top row for player 2 and assign Grass terrain
        for (int x = 0; x < boardWidth; x++)
        {
            TileData topTile = BoardManager.Instance.GetTile(x, boardHeight - 1);
            if (topTile != null)
            {
                topTile.terrainType = TerrainType.Grass;
                topTile.tileType = TileType.Grass;
                topTile.isRevealed = true;
            }
            FogOfWarManager.Instance.RevealTile(new Vector2Int(x, boardHeight - 1));
            TileController topTc = BoardManager.Instance.GetTileController(new Vector2Int(x, boardHeight - 1));
            topTc?.UpdateVisual();
        }

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
