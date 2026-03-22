using System;
using System.Collections.Generic;
using UnityEngine;

public enum TileType
{
    Unknown,
    // Terrain
    Grass, Jungle, Sand, Water, Ice, Desert,
    // Movement
    Tunnel, Plane, Boat, Horse, Catapult, SecretPath, Teleport,
    // Treasure
    Coins, Gems, GoldBar, LegendaryRelic, AncientMap, TreasureChest,
    // Combat
    Ambush, Cannon, BearTrap, Sword, Shield, SniperTower, Mercenary,
    // Hazards
    Volcano, Swamp, Quicksand, Avalanche, Oasis,
    // Structures
    AncientRuins, Watchtower, Camp, Fortress, Temple, Market, Prison, Shrine,
    // Events
    FogStorm, Earthquake, GoldRush, PiratesAttack, RescueMission,
    AncientCurse, LuckyFind, RivalExplorer,
    // Social
    TradingPost, TruceFlag, Spy, Sabotage
}

public enum TerrainType
{
    Grass, Jungle, Sand, Water, Ice, Desert
}

public enum TreasureType
{
    None, Coins, Gems, GoldBar, LegendaryRelic, AncientMap, TreasureChest
}

[Serializable]
public class TileData
{
    public TileType tileType;
    public TerrainType terrainType;
    public bool isRevealed;
    public bool isOccupied;
    public List<string> occupantIds;
    public TreasureType treasureType;
    public int treasureValue;
    public Vector2Int gridPosition;
    public bool hasTunnel;
    public Vector2Int? tunnelExitPosition;

    public TileData(Vector2Int position)
    {
        gridPosition = position;
        tileType = TileType.Unknown;
        terrainType = TerrainType.Grass;
        isRevealed = false;
        isOccupied = false;
        occupantIds = new List<string>();
        treasureType = TreasureType.None;
        treasureValue = 0;
        hasTunnel = false;
        tunnelExitPosition = null;
    }

    /// <summary>
    /// Reveals this tile, making it visible to players.
    /// </summary>
    public void Reveal()
    {
        isRevealed = true;
    }

    /// <summary>
    /// Adds a player or entity occupant to this tile by their unique identifier.
    /// </summary>
    /// <param name="occupantId">The unique identifier of the occupant to add.</param>
    public void AddOccupant(string occupantId)
    {
        occupantIds.Add(occupantId);
        isOccupied = true;
    }

    /// <summary>
    /// Removes a player or entity occupant from this tile by their unique identifier.
    /// </summary>
    /// <param name="occupantId">The unique identifier of the occupant to remove.</param>
    public void RemoveOccupant(string occupantId)
    {
        occupantIds.Remove(occupantId);
        if (occupantIds.Count == 0)
            isOccupied = false;
    }

    /// <summary>
    /// Returns true if this tile contains a treasure pickup.
    /// </summary>
    public bool HasTreasure()
    {
        return treasureType != TreasureType.None;
    }

    /// <summary>
    /// Returns true if this tile can be traversed on foot.
    /// Water tiles require a boat and are not passable by default.
    /// </summary>
    public bool IsPassable()
    {
        return terrainType != TerrainType.Water;
    }
}
