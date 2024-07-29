// classes.ts

import { storage } from "./storage";

export enum StorageType { sharedStorage = "sharedStorage", parkStorage = "parkStorage" }

export interface StorageDefaults {
	[storageType: string]: { [memberName: string]: { path: string; value: any } };
}

export class Worker {
	public isAdditionFixer: boolean = true;
	public isRepairing: boolean = false;
	public fixedAdditions: number = 0;
	public animationOffset: number = 0;
	public lastAnimationIndex: number = 0;
	public orgDirection: number = 0;
}

export class OccupiedTile {
	public x: number = 0;
	public y: number = 0;
	public z: number = 0;
}

export class StorageHandler<T> {

	private storageName: string;
	private storageType: StorageType;

	constructor(storageName: string, storageType: StorageType, private factory: () => T) { this.storageName = storageName; this.storageType = storageType; }

	public get data(): Record<number, T> {
		return storage[this.storageType].get(this.storageName);
	}

	public new(id: number): void {
		if (!this.exist(id))
			this.data[id] = Object.assign({}, this.factory());
	}

	public delete(id: number): void {
		if (this.exist(id))
			delete this.data[id];
	}

	public exist(id: number): boolean {
		return id in this.data;
	}

	public set data(newdata: Record<number, T>) {
		storage[this.storageType].set(this.storageName, newdata);
	}

}

export const workers = new StorageHandler<Worker>("workers", StorageType.parkStorage, () => new Worker());
export const occupiedTiles = new StorageHandler<OccupiedTile>("occupiedTiles", StorageType.parkStorage, () => new OccupiedTile());