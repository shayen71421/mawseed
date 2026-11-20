# Mawseed

A 3D open-world evolution game for the Codex Community Kochi Game Jam. Begin in a tidal nursery as a single cell. Live fourteen forms across two paths, then craft a handaxe and explore as a human. The habitat streams in as you travel.

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
| Face prey, or scan and cycle visible quarry while flying | G |
| Evolve or buy skills | E / T |
| View lineage | L |
| Atlas or camera | M / V |
| Rest at maturity | Hold X (perch first as a bird) |
| Run as a human | Hold B or toggle Run |
| Pause | Escape |

Consume the prey named in your hunt to unlock evolution. Larger predators telegraph their attacks and expose themselves while recovering. Death opens a form picker. Choose a newly unlocked life or return to an earlier checkpoint with its own growth and hunt progress. Purchased skills carry across lives. Progress saves in the browser.

The canopy bird uses Eagle Eye to spot up to five moths and a talon dive to catch one. The pollinator can hover above ground mites and drop into a sting. In both forms, press G to select prey, then Space to strike. Tree cover can interrupt the approach. The title screen offers practice visits for both forms, independent of your saved lineage.

## Lineage

After Amoeba and Cell colony, choose a first path. The plant path runs from Rooted shoot to Fruit tree. The animal path runs through Glassfin, Cleaner fish, Lungfish, Earthworm, Shell grazer, Silk hunter, Pollinator and Canopy bird.

Seedfall marks the ripe tree’s final season. Mature trees and birds keep playing until death, when a new path can open in the rebirth menu. Completing both paths unlocks Toolmaker. Craft the stone tool and choose Human to enter free roam. Seedfall and toolmaking visits on the title screen demonstrate these stages independently of your saved run.
