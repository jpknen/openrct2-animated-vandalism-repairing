/// <reference path="../bin/openrct2.d.ts" />

/*
To do:
- window: list view of mechanics to get the stats
- repair only when not heading for ride inspections
*/

var defaults = {
	pluginEnabled: { path: "AnimatedVandalismRepairing.pluginEnabled", value: true },
	repairTime: { path: "AnimatedVandalismRepairing.repairTime", value: 5 },
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

// hold the data of mechanics
var workersList = {};

var tick_updateWorkerList = 0;
var tick_repairAdditions = 0;

function RandomInt(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

function UpdateWorkerList() {

	if (!storage.pluginEnabled.get())
		return;
	
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
						occupiedTile: [-1, -1],
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

function RepairAdditions() {

	if (!storage.pluginEnabled.get())
		return;

	// could be something else
	if (park.cash < 100)
		return;

	tick_repairAdditions++;

	if (tick_repairAdditions >= 40) {
		for (var key in workersList) {
			var workerTile = map.getTile(workersList[key].data.x / 32, workersList[key].data.y / 32);

			for (var i = 0; i < workerTile.numElements; i++) {
				var element = workerTile.getElement(i);

				if (element.type == "footpath") {
					if (element.isAdditionBroken) {

						// check if tile is already being fixed by other workers
						var occupied = false;
						for (var key2 in workersList) {
							if (key != key2) {
								if (workerTile.x == workersList[key2].occupiedTile[0] &&
									workerTile.y == workersList[key2].occupiedTile[1]) {
									occupied = true;
									break;
								}
							}
						}

						// start repairing the addition and set the repair animation
						if (!workersList[key].isRepairing && !occupied) {
							workersList[key].orgDirection = workersList[key].data.direction;

							workersList[key].isRepairing = true;
							workersList[key].repairTime = 0;
							workersList[key].occupiedTile = [workerTile.x, workerTile.y];

							var animations = ["staffFix", "staffFix2", "staffFixGround", "staffFix3"];

							workersList[key].data.animation = animations[RandomInt(0, 3)];

							var possibleDirections = {
								0: [3, 1],
								1: [0, 2],
								2: [1, 3],
								3: [2, 0]
							};

							var currentDirection = workersList[key].data.direction;
							var repairingDirection = possibleDirections[currentDirection][RandomInt(0, 1)];

							workersList[key].data.direction = repairingDirection;
							workersList[key].data.setFlag("positionFrozen", true);

						}

						// loop this as long as timer is set and finally repair & release the worker
						if (workersList[key].isRepairing) {
							if (workersList[key].repairTime >= parseInt(storage.repairTime.get())) {
								workersList[key].isRepairing = false;
								workersList[key].repairTime = 0;
								workersList[key].occupiedTile = [-1, -1];
								workersList[key].fixedAdditions++;

								workersList[key].data.animation = "walking";
								workersList[key].data.setFlag("positionFrozen", false);

								workersList[key].data.direction = workersList[key].orgDirection;

								context.executeAction("footpathadditionplace", {
									x: workerTile.x * 32,
									y: workerTile.y * 32,
									z: element.baseZ,
									object: element.addition
								});
							}

							workersList[key].repairTime++;
						}
					}

					break;
				}
			}
		}

		tick_repairAdditions = 0;
	}
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

function OpenWindow() {
	var window = ui.getWindow('animated_vandalism_repairing');
	if (window) {
		window.bringToFront();
		return;
	}

	var winWidth = 200;
	var winHeight = 100;
	var widgets = [];

	widgets.push({
		type: 'checkbox',
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
					workersList[key].occupiedTile = [-1, -1];
					workersList[key].data.setFlag("positionFrozen", false);
					workersList[key].data.animation = "walking";
				}
			}
		}
	});

	widgets.push({
		type: 'label',
		x: 5,
		y: 40,
		width: 100,
		height: 15,
		tooltip: 'The time it takes to repair the addition (almost real world seconds)',
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
		type: 'label',
		x: 5,
		y: 75,
		width: 190,
		height: 40,
		tooltip: '',
		textAlign: "centred",
		text: "Only mechanics are able to repair\nbroken additions."
	});

	var win = {
		classification: 'animated_vandalism_repairing',
		width: winWidth,
		height: winHeight,
		title: 'Animated vandalism repairing',
		widgets: widgets
	};

	ui.openWindow(win);
}

function main() {
	//OpenWindow();
	ui.registerMenuItem("Animated vandalism repairing", function () { OpenWindow(); });

	context.subscribe("interval.tick", UpdateWorkerList);
	context.subscribe("interval.tick", RepairAdditions);
}

registerPlugin(
	{
		name: "Animated vandalism repairing",
		version: "1.0",
		authors: ["jpknen"],
		type: "local",
		minApiVersion: 94, // https://github.com/OpenRCT2/OpenRCT2/blob/v0.4.12/src/openrct2/scripting/ScriptEngine.h#L50
		licence: "MIT",
		main: main
	}
);