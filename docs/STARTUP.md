# FOGBOUND — Session Startup Checklist

## After Every Restart

### Step 1 — Docker (30 seconds)
Open OrbStack
Wait for PostgreSQL and Redis to show green

### Step 2 — Unity Editor (1-2 minutes)
Open Unity Hub
Open fogbound/game project
Wait for Unity to fully load (bottom-right spinner gone)

### Step 3 — Unity MCP Server (10 seconds)
In Unity: Window → AI Game Developer
Click "Start" next to MCP server
Confirm: Unity green dot + MCP server green dot

### Step 4 — Backend (only when testing networking)
cd /path/to/fogbound/backend
npm run start:dev
Confirm: NestJS running on port 3007
Confirm: Colyseus running on port 2568

### Step 5 — Claude Code (automatic)
cd /path/to/fogbound
claude
Type: sprint

## What Does NOT Need Setup After Restart
- Claude Code MCP client (reads .mcp.json automatically)
- Git (always ready)
- VSCode (open normally)

## Port Reference
PostgreSQL: 5444
Redis:      6399
NestJS:     3007
Colyseus:   2568
Unity MCP:  53752 (may change — check AI Game Developer window)

## If Unity MCP Port Changed After Restart
Unity auto-assigns port 53752 but it CAN change.
Check the port in Window → AI Game Developer → Server URL
If changed, update .mcp.json in project root:
  "url": "http://localhost:NEW_PORT"

Then in Claude Code:
  claude mcp list
  (should show ai-game-developer connected)

Commit and push after:
  git add .mcp.json
  git commit -m "chore: update unity mcp port"
  git push origin develop
