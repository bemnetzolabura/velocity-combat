# VELOCITY COMBAT
> **Race. Fight. Dominate.** — An 8-player multiplayer racing-combat game in the browser
8 players enter an arena. Race + fight. Last car standing OR first to finish wins. Built with Three.js, Socket.io, and Cannon-es.
---
## Quick Start
```bash
npm install && npm run dev
```
This starts:
- **Server** (port 3001) — game logic, matchmaking, physics, AI
- **Client** (port 3000) — Three.js 3D game
Open **http://localhost:3000** in your browser.
---
## How to Play
### PC Controls
| Action | Input |
|--------|-------|
| Steer | WASD or Arrow Keys |
| Aim | Mouse |
| Shoot | Click (hold 1s for missile lock) |
| Nitro Boost | Spacebar |

### Mobile Controls
Left thumb = steer joystick  
Right thumb = gas/brake joystick  
Buttons: FIRE, NITRO, MISSILE
---
## Features

| # | Feature | Details |
|---|---------|---------|
| 1 | **Main Menu** | Play, username input, car select, leaderboard |
| 2 | **Matchmaking** | Auto-joins lobby, AI bots fill empty slots |
| 3 | **Arena** | Desert Canyon track, boost pads, ramps, explosive barrels |
| 4 | **3 Cars** | Street (balanced), Muscle (tank), Hyper (fast/fragile) |
| 5 | **2 Weapons** | Machine gun (click), Missile (hold 1s lock) |
| 6 | **Health** | 100 HP, explode at 0, respawn in 3s |
| 7 | **Nitro** | Drift fills bar, spacebar burns for speed burst |
| 8 | **Scoring** | Kills + finish position = XP → unlock skins |
| 9 | **Leaderboard** | Top players by wins, persists in localStorage |
| 10 | **Audio** | Engine, gunfire, explosions, nitro, menu music |

---

## Project Structure

```
velocity-combat/
├── package.json
├── README.md
├── shared/
│   ├── constants.js    # Game constants and config
│   ├── cars.js         # Car stats, skins, XP table
│   └── weapons.js      # Weapon definitions, pickups
├── server/
│   ├── index.js        # Express + Socket.io server
│   ├── matchmaking.js  # Lobby, queue, game creation
│   ├── gameLoop.js     # 20-tick/sec server update
│   ├── physics.js      # Cannon-es physics, collisions
│   └── ai.js           # AI bot behaviors
├── client/
│   ├── index.html      # Entry point
│   ├── css/style.css   # All styling
│   └── js/
│       ├── main.js     # Bootstrap, wires subsystems
│       ├── menu.js     # Menu, lobby, leaderboard UI
│       ├── game.js     # Three.js engine, rendering loop
│       ├── network.js  # Socket.io client
│       ├── controls.js # Keyboard, mouse, mobile touch
│       ├── cars.js     # Car 3D rendering
│       ├── weapons.js  # Projectile and explosion rendering
│       ├── ui.js       # HUD, scoreboard, minimap
│       ├── audio.js    # Web Audio procedural sounds
│       └── assets.js   # Procedural 3D models
└── assets/             # (reserved for future use)
```

---

## Tech Stack

- **Three.js** — WebGL 3D rendering
- **Socket.io** — Real-time multiplayer
- **Cannon-es** — Vehicle physics (server-side simulation)
- **Web Audio API** — Procedural sound effects
- **Express** — Static file serving

---

## Deploy

### Backend (Render)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Create a new **Web Service** on Render
2. Connect your GitHub repo
3. Set:
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
4. Deploy

### Frontend (Vercel)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. `vercel --prod` in the project root
2. Or: import your GitHub repo on Vercel
3. No build step needed — it serves `client/` as static files

> Update the server URL in `client/js/network.js` to point to your Render URL.

---

## Development

```bash
# Install dependencies
npm install

# Run both server and client
npm run dev

# Run only server
npm run server

# Run only client
npm run client
```

---

## License

MIT
