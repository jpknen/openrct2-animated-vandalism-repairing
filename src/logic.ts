// logic.ts

import { animations, repairDirs } from "./conf";
import { Worker, OccupiedTile, workers, occupiedTiles } from "./classes";

let tick_repairAdditions: number = 0;

function RandomIndex(lastIndex: number, max: number) : number {
	let randomIndex = Math.floor(Math.random() * max);
	if (randomIndex == lastIndex)
		return RandomIndex(lastIndex, max);
	return randomIndex;
}

// return worker id or null instead of true
export function IsTileOccupied(xyz: { x: number, y: number, z: number }): number {
	let occupiedTile: Record<number, OccupiedTile> = occupiedTiles.data;
	for (let key in occupiedTile)
		if (xyz.x == occupiedTile[key].x && xyz.y == occupiedTile[key].y && xyz.z == occupiedTile[key].z)
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

export function UpdateWorkersData() : void {

	let workerIds: number[] = [];

	let staff: Staff[] = map.getAllEntities("staff");

	// get in game worker ids to list
	staff.forEach(staffMember => {
		if (staffMember.staffType == "mechanic")
			workerIds.push(staffMember.id as number);
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

export function RepairAdditions() : void {

	tick_repairAdditions++;

	if (tick_repairAdditions >= 30) {

		let workersAll: Record<number, Worker> = workers.data;

		for (let id in workersAll) {

			// could be something else
			if (park.cash < 100) {

				// if theres no cash and worker is stuck repairing, release it
				if (workersAll[id].isRepairing)
					Release(Number(id));

				continue;
			}

			// if worker is not marked as addition fixer, continue to next
			if (!workersAll[id].isAdditionFixer)
				continue;

			let entity: Entity = map.getEntity(Number(id));
			let staffMember: Staff = <Staff>entity;

			let tile: Tile = map.getTile(staffMember.x / 32, staffMember.y / 32);

			for (let i = 0; i < tile.numElements; i++) {

				let element: TileElement = tile.getElement(i);

				if (
					element.type == "footpath" && element.isAdditionBroken &&
					// check if staffMember is on same height
					staffMember.z >= element.baseZ && staffMember.z < element.baseZ + 16 &&
					// will ignore intersections
					element.edges != 15
				) {

					// check if staffMember is not repairing
					if (!workersAll[id].isRepairing) {

						// check if tile is already being fixed by other workers
						const occupiedId: number = IsTileOccupied({ x: tile.x, y: tile.y, z: element.baseZ });
	
						// start repairing the addition and set the repair animation if tile not occupiedId
						if (occupiedId == -1) {

							workersAll[id].orgDirection = staffMember.direction; // save original direction
							workersAll[id].isRepairing = true;
							workersAll[id].animationOffset = 0;

							let lastAnimationIndex = workersAll[id].lastAnimationIndex;
							let newAnimationIndex = RandomIndex(lastAnimationIndex, animations.length);
							workersAll[id].lastAnimationIndex = newAnimationIndex;

							staffMember.animation = animations[newAnimationIndex] as StaffAnimation;
							staffMember.direction = repairDirs[element.edges][Math.floor(Math.random() * repairDirs[element.edges].length)] as Direction;
							staffMember.setFlag("positionFrozen", true);

							// set this tile as occupied
							occupiedTiles.data[id] = { x: tile.x, y: tile.y, z: element.baseZ };

						}
					}

					// loop this as long as animationOffset is set and finally repair & release the staffMember
					if (workersAll[id].isRepairing) {

						if (staffMember.animationOffset > workersAll[id].animationOffset)
							workersAll[id].animationOffset = staffMember.animationOffset;

						if (staffMember.animationOffset < workersAll[id].animationOffset) {

							context.executeAction(
								"footpathadditionplace",
								{
									x: occupiedTiles.data[id].x * 32,
									y: occupiedTiles.data[id].y * 32,
									z: occupiedTiles.data[id].z,
									object: element.addition
								}
							);

							workersAll[id].isRepairing = false;
							workersAll[id].fixedAdditions++;
							workersAll[id].animationOffset = 0;

							staffMember.animation = "walking";
							staffMember.direction = workersAll[id].orgDirection as Direction; // set back original direction
							staffMember.setFlag("positionFrozen", false);

							occupiedTiles.delete(Number(id));
	
						}

					}
				}
			}
		}

		tick_repairAdditions = 0;
	}
}