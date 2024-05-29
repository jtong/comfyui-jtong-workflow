import { app } from "../../../scripts/app.js";

import * as wg0246 from "./widgets.js";

app.registerExtension({
	name: "0246.Node",
	async beforeRegisterNodeDef (nodeType, nodeData, app) {
		if (typeof nodeData.category === "string" && nodeData.category.startsWith("0246")) {
			switch (nodeData.name) {
				case "jtong.Highway": {
					wg0246.highway_impl(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE, LiteGraph.CIRCLE_SHAPE);
				} break;
			}
		}
	},
});

