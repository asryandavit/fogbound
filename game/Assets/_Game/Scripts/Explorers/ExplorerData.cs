using System;
using System.Collections.Generic;
using UnityEngine;

public enum ExplorerState
{
    Idle, Moving, Digging, Fighting, Celebrating,
    Trapped, Returning, Eliminated
}

[Serializable]
public class InventoryItem
{
    public TileType itemType;
    public int value;
}

[Serializable]
public class ExplorerData
{
    public string explorerId;
    public string playerId;
    public Vector2Int gridPosition;
    public Vector2Int previousPosition;
    public ExplorerState state;
    public bool isBot;
    public bool hasBoat;
    public bool hasBag;
    public List<InventoryItem> inventory;
    public int coinCount;
    public int score;
    public int movesRemainingThisTurn = 1;

    public ExplorerData(string id, string playerid)
    {
        explorerId = id;
        playerId = playerid;
        inventory = new List<InventoryItem>();
        state = ExplorerState.Idle;
        movesRemainingThisTurn = 1;
    }

    /// <summary>
    /// Returns true if the explorer has moves remaining this turn.
    /// </summary>
    public bool CanMove() => movesRemainingThisTurn > 0;

    /// <summary>
    /// Consumes one move from the remaining moves this turn.
    /// </summary>
    public void UseMove() => movesRemainingThisTurn--;

    /// <summary>
    /// Resets the explorer's available moves to 1 for a new turn.
    /// </summary>
    public void ResetMoves() => movesRemainingThisTurn = 1;

    /// <summary>
    /// Returns the maximum number of coins this explorer can carry.
    /// Increases if the explorer has a bag.
    /// </summary>
    public int GetMaxCoins() => hasBag ? 5 : 3;

    /// <summary>
    /// Returns the maximum number of non-coin items this explorer can carry.
    /// Increases if the explorer has a bag.
    /// </summary>
    public int GetMaxOtherItems() => hasBag ? 2 : 1;

    /// <summary>
    /// Returns true if the explorer can pick up more coins.
    /// </summary>
    public bool CanPickupCoins() => coinCount < GetMaxCoins();

    /// <summary>
    /// Returns true if the explorer can pick up another non-coin item.
    /// </summary>
    public bool CanPickupItem()
    {
        int nonCoinCount = 0;
        foreach (InventoryItem item in inventory)
        {
            if (item.itemType != TileType.Coins)
                nonCoinCount++;
        }
        return nonCoinCount < GetMaxOtherItems();
    }

    /// <summary>
    /// Attempts to add a coin with the given value to the explorer's inventory.
    /// Returns true if added, false if the coin limit has been reached.
    /// </summary>
    /// <param name="value">The value of the coin to add.</param>
    public bool AddCoin(int value)
    {
        if (!CanPickupCoins())
            return false;

        inventory.Add(new InventoryItem { itemType = TileType.Coins, value = value });
        coinCount++;
        return true;
    }

    /// <summary>
    /// Attempts to add a non-coin item to the explorer's inventory.
    /// Returns true if added, false if the item limit has been reached.
    /// </summary>
    /// <param name="item">The inventory item to add.</param>
    public bool AddItem(InventoryItem item)
    {
        if (!CanPickupItem())
            return false;

        inventory.Add(item);
        return true;
    }

    /// <summary>
    /// Returns the total value of all items currently in the explorer's inventory.
    /// </summary>
    public int GetTotalValue()
    {
        int total = 0;
        foreach (InventoryItem item in inventory)
            total += item.value;
        return total;
    }
}
