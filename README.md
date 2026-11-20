# Mawseed

A 3D open-world evolution game for the Codex Community Kochi Game Jam. Begin in a tidal nursery as a single cell. Hunt, grow and find a route through thirteen forms, from a glassfin to a fruiting canopy tree. The habitat streams in as you travel.

## Play locally

The playable build ships in `dist/`. From the repository root, run `python3 -m http.server 8000 --directory dist` and open `http://localhost:8000` in a browser. For development, run `npm install` and `npm run build` after changing the source.

## Controls

| Action | Input |
| --- | --- |
| Move | WASD or up/down arrows |
| Look | Drag, Q/R to turn, I/K to tilt |
| Rise or descend | F / C |
| Attack | Space or the attack button |
| Evade | Shift or Dodge |
| Face nearest prey | G |
| Evolve or buy skills | E / T |
| Atlas or camera | M / V |
| Pause | Escape |

Consume the prey named in your hunt to unlock evolution. Larger predators telegraph their attacks and expose themselves while recovering. Death returns you to the last evolution checkpoint with your current growth, hunt progress and purchased skills. Progress saves in the browser.
