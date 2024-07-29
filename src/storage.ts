// storage.ts

import { storageDefaults } from "./conf";

export const storage = {
	sharedStorage: {
		get<T>(memberName: string): T {
			return context.sharedStorage.get(storageDefaults.sharedStorage[memberName].path, storageDefaults.sharedStorage[memberName].value) as T;
		},
		set<T>(memberName: string, value: T): void {
			context.sharedStorage.set(storageDefaults.sharedStorage[memberName].path, value);
		}
	},
	parkStorage: {
		get<T>(memberName: string): T {
			return context.getParkStorage().get(storageDefaults.parkStorage[memberName].path, storageDefaults.parkStorage[memberName].value) as T;
		},
		set<T>(memberName: string, value: T): void {
			context.getParkStorage().set(storageDefaults.parkStorage[memberName].path, value);
		}
	}
}