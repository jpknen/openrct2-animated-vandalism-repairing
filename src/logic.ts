// logic.ts

import { animations, repairDirs } from "./conf";
import { workers, occupiedTiles } from "./classes";

let tick_repairAdditions: number = 0;

function RandomIndex(lastIndex: number, max: number): number {
	let randomIndex = Math.floor(Math.random() * max);
	if (randomIndex == lastIndex)
		return RandomIndex(lastIndex, max);
	return randomIndex;
}

// return worker id instead of true
export function IsTileOccupied(xyz: { x: number, y: number, z: number }): number {
	for (let key in occupiedTiles.data)
		if (xyz.x == occupiedTiles.data[key].x && xyz.y == occupiedTiles.data[key].y && xyz.z == occupiedTiles.data[key].z)
			return Number(key);
	return -1;
}

export function Release(id: number): void {
	if (workers.exist(id)) {
		workers.data[id].isRepairing = false;
		workers.data[id].animationOffset = 0;
		let worker: Staff = <Staff>map.getEntity(id);
		worker.setFlag("positionFrozen", false);
		worker.animation = "walking";
		occupiedTiles.delete(id);
	}
}

export function UpdateWorkersData(): void {

	let workerIds: number[] = [];

	let staff: Staff[] = map.getAllEntities("staff");

	// get in game worker ids to list
	staff.forEach(staffMember => {
		if (staffMember.staffType == "mechanic") 
			workerIds.push(Number(staffMember.id));
	});

	// loop workerIds and add new worker in to workersData if not already in there
	workerIds.forEach(id => {
		if (!workers.exist(id))
			workers.new(id);
	});

	// remove workers from workers.data if they does not exist anymore in game
	for (var key in workers.data) {
		if (workers.data.hasOwnProperty(key) && workerIds.indexOf(Number(key)) === -1)
			delete workers.data[key];
	}

}

export function RepairAdditions(): void {

	tick_repairAdditions++;

	if (tick_repairAdditions >= 30) {

		for (let id in workers.data) {

			// could be something else
			if (park.cash < 100) {

				// if theres no cash and worker is stuck repairing, release it
				if (workers.data[id].isRepairing)
					Release(Number(id));

				continue;
			}

			// if worker is not marked as addition fixer, continue to next
			if (!workers.data[id].isAdditionFixer)
				continue;

			let staffMember: Staff = <Staff>map.getEntity(Number(id));

			let tile: Tile = map.getTile(staffMember.x / 32, staffMember.y / 32);

			tile.elements.forEach(element => {

				if (
					element.type == "footpath" && element.isAdditionBroken &&
					// check if staffMember is on same height
					staffMember.z >= element.baseZ && staffMember.z < element.baseZ + 16 &&
					// will ignore intersections
					element.edges != 15
				) {

					// check if staffMember is not repairing
					if (!workers.data[id].isRepairing) {

						// check if tile is already being fixed by other workers
						const occupiedId: number = IsTileOccupied({ x: tile.x, y: tile.y, z: element.baseZ });

						// start repairing the addition and set the repair animation if tile not occupiedId
						if (occupiedId == -1) {

							workers.data[id].orgDirection = staffMember.direction; // save original direction
							workers.data[id].isRepairing = true;
							workers.data[id].animationOffset = 0;

							let lastAnimationIndex = workers.data[id].lastAnimationIndex;
							let newAnimationIndex = RandomIndex(lastAnimationIndex, animations.length);
							workers.data[id].lastAnimationIndex = newAnimationIndex;

							staffMember.animation = animations[newAnimationIndex];
							staffMember.direction = repairDirs[element.edges][Math.floor(Math.random() * repairDirs[element.edges].length)];
							staffMember.setFlag("positionFrozen", true);

							// set this tile as occupied
							occupiedTiles.data[id] = { x: tile.x, y: tile.y, z: element.baseZ };

						}
					}

					// loop this as long as animationOffset is set and finally repair & release the staffMember
					if (workers.data[id].isRepairing) {

						if (staffMember.animationOffset > workers.data[id].animationOffset)
							workers.data[id].animationOffset = staffMember.animationOffset;

						if (staffMember.animationOffset < workers.data[id].animationOffset) {

							context.executeAction(
								"footpathadditionplace",
								{
									x: occupiedTiles.data[id].x * 32,
									y: occupiedTiles.data[id].y * 32,
									z: occupiedTiles.data[id].z,
									object: element.addition
								}
							);

							workers.data[id].isRepairing = false;
							workers.data[id].fixedAdditions++;
							workers.data[id].animationOffset = 0;

							staffMember.animation = "walking";
							staffMember.direction = workers.data[id].orgDirection; // set back original direction
							staffMember.setFlag("positionFrozen", false);

							occupiedTiles.delete(Number(id));

						}

					}
				}
			});

		}

		tick_repairAdditions = 0;
	}
}