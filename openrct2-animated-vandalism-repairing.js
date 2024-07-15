//// <reference path="../bin/openrct2.d.ts" />

/*
maybe to do:
- window: list view of mechanics to get the stats
- repair only when not heading for ride inspections (it can be time consuming if there is lot of vandalism on the path to ride)
things to fix:
- worker might get stuck in the air if its moved just in the end of the repair
versions:
- 1.0
- 1.1
	- slight code structure changes
	- some minor fixes for multiple workers sharing same tile but on different z axis value
	- invisible additions on path intersections is now ignored
	- added basic list view of mechanics stats on debug window
*/

// sharedStorage & defaults
var defaults = {
	pluginEnabled: { path: "AnimatedVandalismRepairing.pluginEnabled", value: true },
	repairTime: { path: "AnimatedVandalismRepairing.repairTime", value: 5 }
};

var storage = {
	pluginEnabled: {
		get: function () { return context.sharedStorage.get(defaults.pluginEnabled.path, defaults.pluginEnabled.value); },
		set: function (bool) { context.sharedStorage.set(defaults.pluginEnabled.path, bool); }
	},
	repairTime: {
		get: function () { return context.sharedStorage.get(defaults.repairTime.path, defaults.repairTime.value); },
		set: function (num) { context.sharedStorage.set(defaults.repairTime.path, num); }
	}
};

// for debugging info
var debugWinEnabled = false;
var debugViewItems = [];

// hold the data of mechanics
var workersList = {};
var occupiedTiles = {};

// possible animations
var animations = ["staffFix", "staffFix2", "staffFixGround", "staffFix3"];

// possible temporary direction while repairing, key = current direction
var possibleDirections = { 0: [3, 1], 1: [0, 2], 2: [1, 3], 3: [2, 0] };

var tick_updateWorkerList = 0;
var tick_repairAdditions = 0;

function RandomInt(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

function UpdateWorkerList() {

	tick_updateWorkerList++;

	if (tick_updateWorkerList >= 60) {

		var workers = map.getAllEntities("staff");

		var workerIds = [];

		// loop workers and add them in to workersList if not already in there
		for (var i = 0; i < workers.length; i++) {

			var worker = workers[i];

			if (worker.staffType == "mechanic") {
				if (!(worker.id in workersList)) {
					workersList[worker.id] =
					{
						data: worker,
						isRepairing: false,
						repairTime: 0,
						fixedAdditions: 0
					};
				}
				workerIds.push(worker.id);
			}
		}

		// remove workers from workersList if they does not exist anymore in game
		for (var key in workersList) {
			var found = false;
			for (var i = 0; i < workerIds.length; i++) {
				if (key == workerIds[i]) {
					found = true;
					break;
				}
			}
			if (!found)
				delete workersList[key];
		}

		tick_updateWorkerList = 0;
	}
}

function IsTileOccupied(notThisId, xyz) {
	var occupied = false;
	for (var key in occupiedTiles) {
		if (key != notThisId &&
			xyz.x == occupiedTiles[key].x &&
			xyz.y == occupiedTiles[key].y &&
			xyz.z == occupiedTiles[key].z
		) {
			occupied = true;
			break;
		}
	}
	return occupied;
}

function RepairAdditions() {

	tick_repairAdditions++;

	if (tick_repairAdditions >= 30) {

		for (var id in workersList) {

			var tile = map.getTile(workersList[id].data.x / 32, workersList[id].data.y / 32);

			for (var i = 0; i < tile.numElements; i++) {

				var element = tile.getElement(i);

				if (
					element.type == "footpath" && element.isAdditionBroken &&
					// check if worker is on same height
					workersList[id].data.z >= element.baseZ && workersList[id].data.z < element.baseZ + 32 &&
					// will ignore intersections
					element.edges != 15
				) {

					// check if worker is not repairing
					if (!workersList[id].isRepairing) {

						// check if tile is already being fixed by other workers
						var occupied = IsTileOccupied(id, { x: tile.x, y: tile.y, z: element.baseZ });

						// start repairing the addition and set the repair animation if tile not occupied
						if (!occupied) {

							var currentDirection = workersList[id].data.direction;

							workersList[id].orgDirection = currentDirection; // save original direction
							workersList[id].isRepairing = true;
							workersList[id].repairTime = 0;

							workersList[id].data.animation = animations[RandomInt(0, animations.length - 1)];
							workersList[id].data.direction = possibleDirections[currentDirection][RandomInt(0, 1)];
							workersList[id].data.setFlag("positionFrozen", true);

							// set this tile as occupied
							occupiedTiles[id] = { x: tile.x, y: tile.y, z: element.baseZ };
						}
					}

					// loop this as long as timer is set and finally repair & release the worker
					if (workersList[id].isRepairing) {

						if (workersList[id].repairTime >= parseInt(storage.repairTime.get())) {

							context.executeAction(
								"footpathadditionplace",
								{
									x: occupiedTiles[id].x * 32,
									y: occupiedTiles[id].y * 32,
									z: occupiedTiles[id].z,
									object: element.addition
								}
							);

							workersList[id].isRepairing = false;
							workersList[id].repairTime = 0;
							workersList[id].fixedAdditions++;

							workersList[id].data.animation = "walking";
							workersList[id].data.direction = workersList[id].orgDirection; // set back original direction
							workersList[id].data.setFlag("positionFrozen", false);

							delete occupiedTiles[id];
						}

						workersList[id].repairTime++;
					}
				}
			}
		}

		tick_repairAdditions = 0;
	}
}

function Widget_Update_DebugWinVal() {
	var debug_val = ui.getWindow("animated_vandalism_repairing_debug").findWidget("debug_val");
	debugViewItems = [];
	for (var id in workersList) {
		debugViewItems.push(
			[
				id, 
				workersList[id].data.name, 
				workersList[id].isRepairing ? "1" : "0",
				workersList[id].fixedAdditions.toString(),
				(Math.floor(workersList[id].data.x / 32)) + "-" +
				(Math.floor(workersList[id].data.y / 32)) + "-" + 
				(Math.floor(workersList[id].data.z ))
			]
		);
	}
	debug_val.items = debugViewItems;	
}

function Widget_Update_RepairingTimer(widgetname, increase) {
	var repairingTimerWidget = ui.getWindow("animated_vandalism_repairing").findWidget(widgetname);
	var value = storage.repairTime.get();
	var newValue = value + increase;
	if (newValue < 0)
		newValue = 0;
	else if (newValue > 60)
		newValue = 60;
	storage.repairTime.set(newValue);
	repairingTimerWidget.text = storage.repairTime.get().toString();
}

// main plugin window
function OpenWindow() {

	if (debugWinEnabled)
		OpenWindowDebug();

	var window = ui.getWindow("animated_vandalism_repairing");
	if (window) {
		window.bringToFront();
		return;
	}

	var widgets = [];

	widgets.push({
		type: "checkbox",
		x: 6,
		y: 20,
		width: 190,
		height: 15,
		isChecked: storage.pluginEnabled.get(),
		text: "Enabled",
		onChange: function onChange() {
			storage.pluginEnabled.set(!storage.pluginEnabled.get());
			if (!storage.pluginEnabled.get()) {
				for (var key in workersList) {
					workersList[key].isRepairing = false;
					workersList[key].repairTime = 0;
					workersList[key].data.setFlag("positionFrozen", false);
					workersList[key].data.animation = "walking";
				}
				occupiedTiles = {};
				if (debugWinEnabled)
					Widget_Update_DebugWinVal();
			}
		}
	});

	widgets.push({
		type: "checkbox",
		name: "debugWinEnabled",
		x: 145,
		y: 20,
		width: 90,
		height: 15,
		isChecked: debugWinEnabled,
		text: "Debug",
		onChange: function onChange() {
			debugWinEnabled = !debugWinEnabled;
			if (debugWinEnabled)
				OpenWindowDebug();
			else
				ui.getWindow("animated_vandalism_repairing_debug").close();
		}
	});

	widgets.push({
		type: "label",
		x: 5,
		y: 40,
		width: 100,
		height: 15,
		tooltip: "The time it takes to repair the addition (almost real world seconds)",
		text: "Repair time"
	});

	widgets.push({
		type: "spinner",
		name: "repairTime",
		x: 90,
		y: 38,
		width: 102,
		height: 15,
		text: storage.repairTime.get().toString(),
		onDecrement: function onDecrement() {
			Widget_Update_RepairingTimer("repairTime", -1)
		},
		onIncrement: function onIncrement() {
			Widget_Update_RepairingTimer("repairTime", 1)
		}
	});

	widgets.push({
		type: "label",
		x: 5,
		y: 75,
		width: 190,
		height: 40,
		tooltip: "",
		textAlign: "centred",
		text: "Only mechanics are able to repair\nbroken additions."
	});

	ui.openWindow({
		classification: "animated_vandalism_repairing",
		width: 200,
		height: 100,
		title: "Animated vandalism repairing",
		widgets: widgets,
		onClose: function () {
			ui.getWindow("animated_vandalism_repairing_debug").close();
		}
	});
}

// debug window
function OpenWindowDebug() {
	
	var window = ui.getWindow("animated_vandalism_repairing_debug");
	if (window) {
		window.bringToFront();
		return;
	}

	var widgets = [];

	widgets.push({
		type: 'listview',
		name: 'debug_val',
		x: 5,
		y: 20,
		width: 290,
		height: 175,
		scrollbars: "vertical",
		isStriped: true,
		showColumnHeaders: true,
		columns: [
			{
				canSort: true,
				header: "id",
				ratioWidth: 1
			},
			{
				canSort: true,
				header: "name",
				ratioWidth: 5
			}, 
			{
				canSort: true,
				header: "r",
				ratioWidth: 1
			},
			{
				canSort: true,
				header: "rd",
				ratioWidth: 1
			},
			{
				canSort: true,
				header: "xyz",
				ratioWidth: 3
			}
		],
		selectedCell: 0,
		canSelect: true,
		onClick: function onClick(index) {
			// debugViewItems[index]
		}
	});

	ui.openWindow({
		classification: "animated_vandalism_repairing_debug",
		width: 300,
		height: 200,
		title: "Animated vandalism repairing debug",
		widgets: widgets,
		onClose: function () {
			debugWinEnabled = false;
			ui.getWindow("animated_vandalism_repairing").findWidget("debugWinEnabled").isChecked = false;
		},
		onUpdate: function()
		{
			Widget_Update_DebugWinVal();
		}
	});
}

function IntervalTick() {

	if (!storage.pluginEnabled.get())
		return;

	UpdateWorkerList();

	// could be something else
	if (park.cash < 100)
		return;

	RepairAdditions();
}

function main() {
	//OpenWindow(); 
	//OpenWindowDebug();
	ui.registerMenuItem("Animated vandalism repairing", function () { OpenWindow(); });
	context.subscribe("interval.tick", IntervalTick);
}

registerPlugin(
	{
		name: "Animated vandalism repairing",
		version: "1.1",
		authors: ["jpknen"],
		type: "local",
		minApiVersion: 94, // https://github.com/OpenRCT2/OpenRCT2/blob/v0.4.12/src/openrct2/scripting/ScriptEngine.h#L50
		licence: "MIT",
		main: main
	}
);