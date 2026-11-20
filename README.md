# Mawseed

Mawseed is a 3D open-world evolution game built for the **Codex Community Kochi Game Jam**. You hatch in a tidal pool as an amoeba small enough to fit inside a minnow’s mouth. Your first meal is a drifting cell. Several lives later, you can hunt a moth from the forest floor as a spider or catch it from above as a falcon. The lagoons, shores and forests stream in as you explore them in first or third person.

**[Play Mawseed in your browser](https://cellbound-evolution-jam-1120.chalky-pine-4009.chatgpt.site/)** · Sign in with ChatGPT to open the hosted game.

## Your first life

1. Choose **Begin life**. Press **G** to face a green drifter, swim close, then press **Space** to engulf it. The hunt counter tracks your progress and your body grows as you feed.
2. Each third kill earns a skill point. Open the skill tree with **T** to spend it on traits such as a longer reach or a tougher membrane. Watch predators wind up and use **Shift** to dodge their strike.
3. When **Evolve** appears, press **E** to choose an unlocked form. After the Cell colony, you decide whether to live the plant or animal path first. Press **L** at any time during exploration to see your lineage.

Progress is saved in your browser. To sample a later stage, pick a practice visit on the title screen. **Try web hunting** lets you reel a flying moth down and bite it. As the bird, **G** uses Eagle Eye to cycle through visible moths and **Space** dives for the selected one. As the pollinator, you can hover over a mite and drop into a sting. Practice visits have their own progress and leave your saved lineage intact.

<details>
<summary><strong>All 14 playable forms and how rebirth works</strong> (progression spoilers)</summary>

| Part of the lineage | Forms in play order |
| --- | --- |
| Shared beginning | Amoeba → Cell colony |
| Plant path | Rooted shoot → Fruit tree |
| Animal path | Glassfin → Cleaner fish → Lungfish → Earthworm → Shell grazer → Silk hunter → Pollinator → Canopy bird |
| After both paths | Toolmaker ape → Human |

**Seedfall** is the moment the mature Fruit tree drops its seeds. The tree stays alive and its Evolve button disappears. The mature Canopy bird also reaches a final season. When either life ends, the rebirth menu waits for you to choose. You can take a newly unlocked form or revisit one you’ve lived before. Each form remembers its hunt progress, and purchased skills carry across lives.

Complete both paths to unlock the Toolmaker. Shape a stone handaxe with three strikes, choose Human, and keep exploring on foot. **Try seedfall** and **Try toolmaking** jump straight to those moments from the title screen.

</details>

## Controls

| Action | Input |
| --- | --- |
| Move | **WASD** or **↑ / ↓** to move forward or back |
| Look around | Drag, **Q / R** to turn, **I / K** to tilt |
| Rise / descend while swimming or flying | **F / C** |
| Face prey or cycle targets while flying | **G** |
| Use your form’s attack | **Space** or the attack button |
| Dodge | **Shift** |
| Evolve / open skill tree | **E / T** |
| View lineage / habitat atlas | **L / M** |
| Switch first- and third-person views | **V** |
| Rest at the end of a life | Hold **X** (perch first as a bird) |
| Run as a human | Hold **B** or toggle **Run** |
| Pause | **Esc** |

## Run locally

The playable build is included in `dist/`. From the repository root, run this command and open [localhost:8000](http://localhost:8000/).

```sh
python3 -m http.server 8000 --directory dist
```

The game uses JavaScript, Three.js/WebGL, animated GLB creature models and a Canvas 2D fallback. To work on the source, install the locked dependencies, run the lineage tests, then rebuild the browser bundles with esbuild.

```sh
npm ci
node --test
npm run build
```
