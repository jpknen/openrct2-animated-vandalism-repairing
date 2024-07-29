// mainwin.ts

import { globals } from "../conf";
import { storage } from "../storage"
import { occupiedTiles, workers } from "../classes";
import { Release, UpdateWorkersData } from "../logic"

const userActions = {
	enabled(): void {
		let enabled = storage.sharedStorage.get("enabled");
		storage.sharedStorage.set("enabled", !enabled);
		for (let id in workers.data)
			Release(Number(id));
	}
};

const widgets: WidgetDesc[] | undefined = [];

widgets.push({
	type: "checkbox",
	x: 5, y: 20, width: 60, height: 15,
	isChecked: storage.sharedStorage.get("enabled"),
	text: "Enabled",
	onChange: userActions.enabled
});

widgets.push({
	type: "label",
	x: 5, y: 45, width: 190, height: 40,
	textAlign: "centred",
	text: "Only mechanics are able to repair\nbroken additions."
});

if (globals.isDebug) {

	widgets.push({
		type: "button",
		x: 5, y: 70, width: 190, height: 20,
		text: "log",
		onClick: function () {
			console.log(workers.data);
			console.log(occupiedTiles.data);
		}
	});

	widgets.push({
		type: "button",
		x: 5, y: 90, width: 190, height: 20,
		text: "clear",
		onClick: function () {
			for (let id in workers.data)
				Release(Number(id));
			for (let id in workers.data){
				workers.delete(Number(id));
				occupiedTiles.delete(Number(id));
			}
			UpdateWorkersData();
		}
	});

}

const winDesc: WindowDesc = {
	classification: "animated_vandalism_repairing",
	width: 200, height: globals.isDebug ? 115 : 70,
	title: "Animated vandalism repairing",
	widgets: widgets
};

export const mainWin = {
	open(): void {
		const win: Window = ui.getWindow("animated_vandalism_repairing")
		if (win) {
			win.bringToFront();
			return;
		}
		ui.openWindow(winDesc);
	}
};