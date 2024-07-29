// conf.ts

import { StorageDefaults, Worker, OccupiedTile } from './classes';

export const storageDefaults: StorageDefaults = {
	sharedStorage: {
		"enabled": { path: "AnimatedVandalismRepairing.pluginEnabled", value: true },
	},
	parkStorage: {
		"workers": { path: "AnimatedVandalismRepairing.workers", value: {} as Record<number, Worker> },
		"occupiedTiles": { path: "AnimatedVandalismRepairing.occupiedTiles", value: {} as Record<number, OccupiedTile> },
	}
}

// possible animations
export const animations: string[] = ["staffFix", "staffFix2", "staffFix3", "staffFixGround"];

// possible temporary direction while repairing, key = element.edges
export const repairDirs: { [key in number]: number[] } = { 0: [0, 1, 2, 3], 1: [1, 2, 3], 2: [0, 2, 3], 3: [2, 3], 4: [0, 1, 3], 5: [1, 3], 6: [0, 3], 7: [3], 8: [0, 1, 2], 9: [1, 2], 10: [0, 2], 11: [2], 12: [0, 1], 13: [1], 14: [0] };

export const globals = { isDebug: false };