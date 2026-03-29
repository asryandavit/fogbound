# FOGBOUND — Game Design Document

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Board](#board)
3. [Players and Bases](#players-and-bases)
4. [Movement](#movement)
5. [Inventory](#inventory)
6. [Combat](#combat)
7. [Scoring](#scoring)
8. [Win Conditions](#win-conditions)
9. [Turn Timer](#turn-timer)
10. [Tile Library](#tile-library)

---

## Game Overview

- **Genre:** Turn-based multiplayer strategy mobile board game
- **Core Loop:** Explorers navigate fog-covered islands collecting gems and coins
- **Players:** 2 to 4 players per match
- **Victory:** Player with the most points wins

---

## Board

| Property           | Details                                   |
| ------------------ | ----------------------------------------- |
| **Map Sizes**      | 7×7, 9×9, 11×11, 13×13, 15×15, 17×17      |
| **Starting State** | All tiles face down at start (Fog of War) |

### Terrain Types

| Terrain | Notes   |
| ------- | ------- |
| Grass   | Neutral |
| Jungle  | —       |
| Sand    | —       |
| Water   | —       |
| Ice     | —       |
| Desert  | —       |

---

## Players and Bases

### Starting Positions

- Players start on one side of the map
- At game start, each player chooses base position on their own side only
- Entire starting row/column is revealed at start
- No treasure on starting row/column tiles
- Explorers spawn at the chosen base position

### Player Side Assignment

| Players   | Sides Used                      |
| --------- | ------------------------------- |
| 2 players | Opposite sides — top and bottom |
| 3 players | 3 sides                         |
| 4 players | All 4 sides                     |

### Base Types

Base appearance depends on map theme:

- **Water maps:** Ship
- **Land maps:** Train, Car, Airplane, etc.

### Base Movement Rules

- Moving the base costs the player their **entire turn**
- Base can only move along the player's own side

### Explorers per Player

| Map Size              | Explorers   |
| --------------------- | ----------- |
| Small — 7×7, 9×9      | 1 explorer  |
| Medium — 11×11, 13×13 | 2 explorers |
| Large — 15×15, 17×17  | 3 explorers |

---

## Movement

- **Speed:** 1 tile per turn
- **Directions:** Up, Down, Left, Right only
- **Diagonal movement:** Only via special tiles

### Tunnel Rules

- Explorer enters tunnel; if only one exit is open, explorer is **trapped** until the second exit is discovered
- When the second exit is found by anyone, **both explorers swap positions immediately**
- **No combat inside tunnels — ever**

---

## Inventory

### Default Capacity

- Max **3 coins** + max **1 other item**

### Treasure Bag

| Rule                  | Detail                                                                |
| --------------------- | --------------------------------------------------------------------- |
| **Ownership**         | Bag belongs to 1 explorer only                                        |
| **Capacity with bag** | Max 5 coins + max 2 other items                                       |
| **On delivery**       | Bag disappears when explorer carries treasure back to base            |
| **On attack**         | Explorer drops all treasure, bag disappears, explorer returns to base |

---

## Combat

- **Attacker always wins**
- **Exception:** If the defender carries a Shield, the defender wins
- **On loss:** Loser returns to base and drops **all** treasure on that tile

### Loot Rules

| Combat Type     | Dropped Treasure                                           |
| --------------- | ---------------------------------------------------------- |
| Close combat    | Winner takes all dropped treasure immediately              |
| Distance combat | Treasure stays on the tile; anyone entering can collect it |

---

## Scoring

- Treasure **must** be carried back to base to score points
- Player with the most points wins

---

## Win Conditions

Win conditions are **configurable per map**:

- Time limit runs out
- All treasure has been carried to bases
- A player reaches a points target that others cannot beat

---

## Turn Timer

- Configurable per map and difficulty level
- When the timer expires, the game **auto-selects the safest legal move**

---

## Tile Library

**48 tile types across 6 categories**, released across 3 tiers.

---

### Tier 1 — Launch Tiles (20 tiles)

| Category  | Tiles                                          |
| --------- | ---------------------------------------------- |
| Treasure  | Coins, Gems, Legendary Relic                   |
| Movement  | Tunnel, Boat, Plane                            |
| Terrain   | Jungle, Quicksand, Ice, Desert                 |
| Combat    | Sword, Shield, Cannon                          |
| Structure | Ancient Ruins, Watchtower, Camp                |
| Events    | Fog Storm, Earthquake, Gold Rush, Trading Post |

---

### Tier 2 — Update Tiles (14 tiles)

| Category  | Tiles                                 |
| --------- | ------------------------------------- |
| Treasure  | Gold Bar, Treasure Chest, Ancient Map |
| Movement  | Horse, Catapult, Teleport             |
| Terrain   | Swamp, Volcano, Oasis                 |
| Combat    | Bear Trap, Mercenary                  |
| Structure | Temple, Market, Spy                   |

---

### Tier 3 — Update Tiles (14 tiles)

All remaining tiles from the full library.

---

### Full Tile Library (48 types)

| Category      | Tiles                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| **Treasure**  | Coins, Gems, Gold Bar, Legendary Relic, Ancient Map, Treasure Chest                                         |
| **Movement**  | Tunnel, Plane, Boat, Horse, Catapult, Secret Path, Teleport                                                 |
| **Combat**    | Ambush, Cannon, Bear Trap, Sword, Shield, Sniper Tower, Mercenary                                           |
| **Terrain**   | Jungle, Quicksand, Ice, Desert, Volcano, Swamp, Avalanche, Oasis                                            |
| **Structure** | Ancient Ruins, Watchtower, Camp, Fortress, Temple, Market, Prison, Shrine                                   |
| **Events**    | Fog Storm, Earthquake, Gold Rush, Pirates Attack, Rescue Mission, Ancient Curse, Lucky Find, Rival Explorer |
| **Alliance**  | Trading Post, Truce Flag, Spy, Sabotage                                                                     |
