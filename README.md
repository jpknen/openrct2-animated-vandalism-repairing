# Animated vandalism repairing

OpenRCT2 plugin for repairing the vandalized additions with random repairing animations.

Player can give new order for mechanics (Fix additions).

![openrct2-animated-vandalism-repairing-111](https://github.com/jpknen/openrct2-animated-vandalism-repairing/assets/175154408/de565205-3349-4f78-8634-0884bfcab8ab)

### Features:

- Mechanics will repair vandalized additions (benches, lamps, trash bins ..) a bit more realistic and automated way with random repairing animation
- Repairing will cost normal fee of the addition
- Repairing lasts the length of the animation
- Player can select mechanics to do `Inspect rides (IR), Fix rides (FR), Fix additions (FA)` and give them different uniform color depending on are they selected to repair additions

[openrct2-animated-vandalism-repairing-111.webm](https://github.com/jpknen/openrct2-animated-vandalism-repairing/assets/175154408/53f4a84d-af8e-4bdd-88ef-9ae3f841600b)

### Notes:

Only mechanics are able to play fixing animations as far i know so for example handyman is not very suitable for the task. And anyway mechanics carry a toolbox instead of a sweeping brush, which obviously cant fix much.

Plugin works with OpenRCT2 `v0.4.12` or later.  

Just copy the latest [release](https://github.com/jpknen/openrct2-animated-vandalism-repairing/releases/) into to your OpenRCT2 plugin folder `C:/Users/.../Documents/OpenRCT2/plugin`

### Versions:

### 1.2

- Rewrite most of the code
- Data is saved in to parkStorage
- Added view of the workers list where player can set  orders
- Added uniform coloring option
- Removed the timer option and decided to let the animation length act as timer
- Removed debug window

### 1.1

- Slight code structure changes
- Some minor fixes for multiple workers sharing same tile but on different z axis value
- Invisible additions on path intersections is now ignored
- Added basic list view of mechanics stats on debug window

### 1.0

-

### Maybe to do's:

- Repair only when not heading for ride inspections (it can be time consuming if there is lot of vandalism on the path to ride)
- Better path finding to actually head for broken additions if worker is set to be more of an addition fixer 

### Things to fix:

- Worker might get stuck in the air if its moved just in the end of the repair
- Temp direction should be facing towards addition rather than random left/right, this is easy to fix by checking the element.edges
