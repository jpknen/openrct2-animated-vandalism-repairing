//// <reference path="../bin/openrct2.d.ts" />

// Animated vandalism repairing 1.2

var defaults = {
	// sharedStorage defaults
	pluginEnabled: { path: "AnimatedVandalismRepairing.pluginEnabled", value: true },
	// parkStorage defaults
	workersData: { path: "AnimatedVandalismRepairing.workersData", value: { all: {}, occupiedTiles: {}, totalFixedAdditions: 0, colorDefault: 7, colorFixer: 28 } }
};

var storage = {
	// sharedStorage
	pluginEnabled: {
		get: function () { return context.sharedStorage.get(defaults.pluginEnabled.path, defaults.pluginEnabled.value); },
		set: function (bool) { context.sharedStorage.set(defaults.pluginEnabled.path, bool); }
	},
	// parkStorage
	workersData: {
		get: function () { return context.getParkStorage().get(defaults.workersData.path, defaults.workersData.value); },
		set: function (obj) { context.getParkStorage().set(defaults.workersData.path, obj); }
	}
};

var isDebug = false;

// possible animations
var animations = ["staffFix", "staffFix2", "staffFixGround", "staffFix3"];

// possible temporary direction while repairing, key = current direction
var possibleDirections = { 0: [3, 1], 1: [0, 2], 2: [1, 3], 3: [2, 0] };

//var tick_updateWorkerList = 0;
var tick_repairAdditions = 0;

var winClassification = "animated_vandalism_repairing";
var winTitle = "Animated vandalism repairing";

var listData = [];

// another way to manage storage.workersData
var workersData = {
	data: storage.workersData.get(),
	default: {
		isAdditionFixer: false,
		isRepairing: false,
		fixedAdditions: 0,
		animationOffset: 0
	},
	new: function (id) {
		if (!this.exist(id)) {
			this.data.all[id] = Object.assign({}, this.default);
			this.applyChanges();
		} else {
			console.log(id + " already exists");
		}
	},
	edit: function (id, data) {
		if (this.exist(id)) {
			for (var key in data)
				this.data.all[id][key] = data[key];
			this.applyChanges();
		} else {
			console.log(id + " doesnt exist");
		}
	},
	delete: function (id) {
		if (this.exist(id)) {
			delete this.data.all[id];
			this.applyChanges();
		} else {
			console.log(id + " doesnt exist");
		}
	},
	exist: function (id) {
		if (id in this.data.all)
			return true;
		return false;
	},
	applyChanges: function () {
		storage.workersData.set(this.data);
		this.isUpdated();
	},
	clearAll: function () {
		// reset to defaults
		this.data = defaults.workersData.value;
		this.applyChanges();
	},
	size: function () {
		return Object.keys(this.data.all).length;
	},
	log: function () {
		console.log(this.data);
	},
	isUpdated: function () {
		widgetUpdates.mainWinUpdate();
	},
};

var widgetUpdates = {
	mainWin: function () { return ui.getWindow(winClassification) },
	mainWinUpdate: function () {
		if (this.mainWin()) {
			this.workersDataView();
			this.mainWin().findWidget("colorDefault").colour = workersData.data.colorDefault;
			this.mainWin().findWidget("colorFixer").colour = workersData.data.colorFixer;
		}
	},
	workersDataView: function () {
		if (this.mainWin()) {
			listData = [];
			for (var id in workersData.data.all) {
				var worker = map.getEntity(parseInt(id));
				listData.push(
					[
						"{WHITE}" + worker.name,
						worker.orders & 1 ? "{WHITE}✓" : "",
						worker.orders & 2 ? "{WHITE}✓" : "",
						workersData.data.all[id].isAdditionFixer ? "{WHITE}✓" : " ",
						id
					]
				);
			}
			this.mainWin().findWidget("workersDataView").items = listData;
		}
	},
	changeAdditionFixerStatus: function (id) {
		var bool = !workersData.data.all[id].isAdditionFixer;
		workersData.data.all[id].isAdditionFixer = bool;
		map.getEntity(parseInt(id)).colour = bool ? workersData.data.colorFixer : workersData.data.colorDefault;
		if (!bool && workersData.data.all[id].isRepairing) {
			workersData.data.all[id].isRepairing = false;
			workersData.data.all[id].animationOffset = 0;
			var worker = map.getEntity(parseInt(id));
			worker.setFlag("positionFrozen", false);
			worker.animation = "walking";
			if (id in workersData.data.occupiedTiles)
				delete workersData.data.occupiedTiles[id];
		}
		workersData.applyChanges();
	},
	changeDuties: function (id, index) {
		var worker = map.getEntity(parseInt(id));
		var newordersList = { 1: [1, 0, 3, 2], 2: [2, 3, 0, 1] };
		worker.orders = newordersList[index][worker.orders];
		widgetUpdates.mainWinUpdate();
	}
};

function RandomInt(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

function UpdateWorkersData() {

	var workerIds = [];

	var workers = map.getAllEntities("staff");

	// get in game worker ids to list
	for (var i = 0; i < workers.length; i++) {
		if (workers[i].staffType == "mechanic")
			workerIds.push(workers[i].id);
	}

	// loop workerIds and add new worker in to workersData if not already in there
	for (var i = 0; i < workerIds.length; i++) {
		if (!workersData.exist(workerIds[i]))
			workersData.new(workerIds[i]);
	}

	// remove workers from workersData if they does not exist anymore in game
	for (var key in workersData.data.all) {
		var found = false;
		for (var i = 0; i < workerIds.length; i++) {
			if (key == workerIds[i]) {
				found = true;
				break;
			}
		}
		if (!found)
			workersData.delete(key);
	}

	workersData.applyChanges();
}

function IsTileOccupied(notThisId, xyz) {
	for (var key in workersData.data.occupiedTiles)
		if (key != notThisId && xyz.x == workersData.data.occupiedTiles[key].x && xyz.y == workersData.data.occupiedTiles[key].y && xyz.z == workersData.data.occupiedTiles[key].z)
			return true;
	return false;
}

function RepairAdditions() {

	tick_repairAdditions++;

	if (tick_repairAdditions >= 30) {

		for (var id in workersData.data.all) {

			// if worker is not marked as addition fixer, continue to next
			if (!workersData.data.all[id].isAdditionFixer)
				continue;

			var worker = map.getEntity(parseInt(id));

			var tile = map.getTile(worker.x / 32, worker.y / 32);

			for (var i = 0; i < tile.numElements; i++) {

				var element = tile.getElement(i);

				if (
					element.type == "footpath" && element.isAdditionBroken &&
					// check if worker is on same height
					worker.z >= element.baseZ && worker.z < element.baseZ + 32 &&
					// will ignore intersections
					element.edges != 15
				) {

					// check if worker is not repairing
					if (!workersData.data.all[id].isRepairing) {

						// check if tile is already being fixed by other workers
						var occupied = IsTileOccupied(id, { x: tile.x, y: tile.y, z: element.baseZ });

						// start repairing the addition and set the repair animation if tile not occupied
						if (!occupied) {

							var currentDirection = worker.direction;

							workersData.data.all[id].orgDirection = currentDirection; // save original direction
							workersData.data.all[id].isRepairing = true;
							workersData.data.all[id].animationOffset = 0;

							worker.animation = animations[RandomInt(0, animations.length - 1)];
							worker.direction = possibleDirections[currentDirection][RandomInt(0, 1)];
							worker.setFlag("positionFrozen", true);

							// set this tile as occupied
							workersData.data.occupiedTiles[id] = { x: tile.x, y: tile.y, z: element.baseZ };

							workersData.applyChanges();
						}
					}

					// loop this as long as timer is set and finally repair & release the worker
					if (workersData.data.all[id].isRepairing) {

						if (worker.animationOffset > workersData.data.all[id].animationOffset)
							workersData.data.all[id].animationOffset = worker.animationOffset;

						if (worker.animationOffset < workersData.data.all[id].animationOffset) {

							context.executeAction(
								"footpathadditionplace",
								{
									x: workersData.data.occupiedTiles[id].x * 32,
									y: workersData.data.occupiedTiles[id].y * 32,
									z: workersData.data.occupiedTiles[id].z,
									object: element.addition
								}
							);

							workersData.data.all[id].isRepairing = false;
							workersData.data.all[id].fixedAdditions++;
							workersData.data.all[id].animationOffset = 0;

							workersData.data.totalFixedAdditions++;

							worker.animation = "walking";
							worker.direction = workersData.data.all[id].orgDirection; // set back original direction
							worker.setFlag("positionFrozen", false);

							delete workersData.data.occupiedTiles[id];

							workersData.applyChanges();

						}

					}
				}
			}
		}

		tick_repairAdditions = 0;
	}
}

function OpenMainWindow() {

	var window = ui.getWindow(winClassification);
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
				for (var key in workersData.data.all) {

					workersData.data.all[key].isRepairing = false;
					workersData.data.all[key].animationOffset = 0;

					var worker = map.getEntity(parseInt(key));

					worker.setFlag("positionFrozen", false);
					worker.animation = "walking";
				}
				workersData.data.occupiedTiles = {};

				workersData.applyChanges();
			}
		}
	});

	widgets.push({
		type: "colourpicker",
		name: "colorDefault",
		x: 140,
		y: 20,
		width: 20,
		height: 20,
		colour: workersData.data.colorDefault,
		onChange: function (result) {
			workersData.data.colorDefault = result;
			for (var id in workersData.data.all) {
				if (!workersData.data.all[id].isAdditionFixer)
					map.getEntity(parseInt(id)).colour = result;
			}
			workersData.applyChanges();
		}
	});

	widgets.push({
		type: "colourpicker",
		name: "colorFixer",
		x: 167,
		y: 20,
		width: 20,
		height: 20,
		colour: workersData.data.colorFixer,
		onChange: function (result) {
			workersData.data.colorFixer = result;
			for (var id in workersData.data.all) {
				if (workersData.data.all[id].isAdditionFixer)
					map.getEntity(parseInt(id)).colour = result;
			}
			workersData.applyChanges();
		}
	});

	widgets.push({
		type: 'listview',
		name: 'workersDataView',
		x: 5,
		y: 40,
		width: 190,
		height: 100,
		scrollbars: "vertical",
		isStriped: false,
		showColumnHeaders: true,
		columns: [
			{
				canSort: false,
				header: "{WHITE}Name",
				width: 125
			},
			{
				canSort: false,
				header: "{WHITE}IR",
				width: 15
			},
			{
				canSort: false,
				header: "{WHITE}FR",
				width: 18
			},
			{
				canSort: false,
				header: "{WHITE}FA",
				width: 18
			}
		],
		selectedCell: 0,
		canSelect: false,
		items: [],
		onClick: function (index, column) {
			var id = listData[index][4];
			if (column == 0) {
				console.log(id);
				// open worker window
				//ui.openWindow(id);
			}
			if (column == 1 || column == 2)
				widgetUpdates.changeDuties(id, column);
			if (column == 3)
				widgetUpdates.changeAdditionFixerStatus(id);
		}
	});

	widgets.push({
		type: "label",
		x: 130,
		y: 41,
		width: 20,
		height: 12,
		tooltip: "Inspect rides",
		//text: "IR"
	});

	widgets.push({
		type: "label",
		x: 145,
		y: 41,
		width: 20,
		height: 12,
		tooltip: "Fix rides",
		//text: "FR"
	});

	widgets.push({
		type: "label",
		x: 163,
		y: 41,
		width: 20,
		height: 12,
		tooltip: "Fix additions",
		//text: "FA"
	});

	var winHeight = 150;

	if (isDebug) {
		winHeight = 220;
		widgets.push({
			type: "button",
			x: 5,
			y: 150,
			width: 190,
			height: 20,
			text: "workersData.log",
			onClick: function () {
				workersData.log();
			}
		});

		widgets.push({
			type: "button",
			x: 5,
			y: 170,
			width: 190,
			height: 20,
			text: "workersData.update",
			onClick: function () {
				UpdateWorkersData();
			}
		});

		widgets.push({
			type: "button",
			x: 5,
			y: 190,
			width: 190,
			height: 20,
			text: "workersData.clearAll",
			onClick: function () {
				workersData.clearAll();
				UpdateWorkersData();
			}
		});

	}

	ui.openWindow({
		classification: winClassification,
		width: 200,
		height: winHeight,
		title: winTitle,
		widgets: widgets
	});

	widgetUpdates.mainWinUpdate();
}

function IntervalTick() {

	if (!storage.pluginEnabled.get())
		return;

	// could be something else
	if (park.cash < 100)
		return;

	RepairAdditions();

}

function main() {

	//OpenMainWindow();

	ui.registerMenuItem(winTitle, OpenMainWindow);

	// first load to integrate in game workers to workersData
	UpdateWorkersData();

	context.subscribe("interval.tick", IntervalTick);

	// then listen for staff changes on "staffhire" & "stafffire"
	context.subscribe("action.execute", function (e) {

		if (e.action == "staffhire" && e.args && e.args.staffType == 1)
			workersData.new(e.result.peep);

		if (e.action == "stafffire")
			workersData.delete(e.args.id);

		if (e.action == "staffsetorders" || e.action == "staffsetname")
			widgetUpdates.mainWinUpdate();

	});

}

registerPlugin({
	name: "Animated vandalism repairing",
	version: "1.2",
	authors: ["jpknen"],
	type: "local",
	targetApiVersion: 94,
	minApiVersion: 94, // https://github.com/OpenRCT2/OpenRCT2/blob/v0.4.12/src/openrct2/scripting/ScriptEngine.h#L50
	licence: "MIT",
	main: main
});