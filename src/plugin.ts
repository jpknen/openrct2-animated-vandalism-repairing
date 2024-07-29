/// <reference path="../lib/openrct2.d.ts" /> 

import { main } from './main';

registerPlugin({
	name: "Animated Vandalism Repairing",
	version: "1.2.1",
	authors: ["jpknen"],
	type: "local",
	targetApiVersion: 94,
	minApiVersion: 94, // https://github.com/OpenRCT2/OpenRCT2/blob/v0.4.12/src/openrct2/scripting/ScriptEngine.h#L50
	licence: "MIT",
	main: main
});