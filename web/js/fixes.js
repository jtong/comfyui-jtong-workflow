import { app } from "../../../scripts/app.js";
import * as lib0246 from "./utils.js";
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

// Probably safe enough unless someone else attempting to reuse these. Ouch.
const patch_node_db = [
	["Highway", "jtong.Highway"]
];

const patch_node_db_0_0_3 = [
	["0246.ScriptPlan", "0246.ScriptRule"],
	["0246.ScriptImbue", "0246.ScriptNode"],
];

let PATCH_SIG = [];

function patch_script(workflow) {
	for (let i = 0; i < workflow.nodes.length; ++ i) {
		for (let j = 0; j < patch_node_db_0_0_3.length; ++ j) {
			if (workflow.nodes[i].type === patch_node_db_0_0_3[j][0]) {
				console.warn(`[ComfyUI-0246] Patching node "${workflow.nodes[i].type}" to "${patch_node_db_0_0_3[j][1]}"`);
				workflow.nodes[i].type = patch_node_db_0_0_3[j][1];
				if (workflow.nodes[i].type === "0246.ScriptRule") {
					workflow.nodes[i].outputs.shift();
					workflow.nodes[i].widgets_values[0] = workflow.nodes[i].widgets_values[3];
				} else if (workflow.nodes[i].type === "0246.ScriptNode")
					workflow.nodes[i].outputs[2].name = "script_exec_data";
				if (!PATCH_SIG.includes(2))
					PATCH_SIG.push(2);
				break;
			} else if (workflow.nodes[i].type === patch_node_db_0_0_3[j][1])
				break;
		}
	}
}

lib0246.hijack(app, "loadGraphData", function (workflow) {
	if (!this.mark) {
		PATCH_SIG.length = 0;
		if (workflow) {
			if (!workflow?.extra?.["0246.VERSION"]) {
				for (let i = 0; i < workflow.nodes.length; ++ i) {
					for (let j = 0; j < patch_node_db.length; ++ j) {
						if (workflow.nodes[i].type === patch_node_db[j][0]) {
							console.warn(`[ComfyUI-0246] Patching node "${workflow.nodes[i].type}" to "${patch_node_db[j][1]}"`);
							workflow.nodes[i].type = patch_node_db[j][1];
							break;
						} else if (workflow.nodes[i].type === patch_node_db[j][1])
							break;
					}
					if ((workflow.nodes[i].type === "jtong.Highway" || workflow.nodes[i].type === "0246.HighwayBatch") && !PATCH_SIG.includes(1))
						PATCH_SIG.push(1);
					else if (workflow.nodes[i].type === "0246.Hub") {
						console.warn(`[ComfyUI-0246] Patching node "${workflow.nodes[i].id}" with value __BATCH__ to __BATCH_PRIM__`);
						if (workflow.nodes[i].widgets_values?.[0] === "__BATCH__")
							workflow.nodes[i].widgets_values[0] = "__BATCH_PRIM__";
						const curr_type_list = workflow.extra["0246.HUB_DATA"][workflow.nodes[i].id].sole_type;
						if (workflow.nodes[i].outputs)
							for (let j = 0; j < workflow.nodes[i].outputs.length; ++ j) {
								const curr_name = workflow.nodes[i].outputs[j].name;
								if (curr_name?.endsWith?.("__BATCH__")) {
									const curr_type = curr_type_list[curr_name];
									curr_type[curr_type.length - 1] = "__BATCH_PRIM__";
									const new_name = curr_type.join(":");
									curr_type_list[new_name] = curr_type;
									delete curr_type_list[curr_name];
									workflow.nodes[i].outputs[j].name = new_name;
								}
							}
					}
				}
				patch_script(workflow);
			}
			else if (
				workflow.extra["0246.VERSION"][0] === 0 &&
				workflow.extra["0246.VERSION"][1] === 0 &&
				workflow.extra["0246.VERSION"][2] === 3
			)
				patch_script(workflow);

			for (let i = 0; i < workflow.nodes.length; ++ i)
				if (workflow.nodes[i].type === "0246.BoxRange") {
					if (workflow.nodes[i].widgets_values[0] === "ConditioningSetAreaPercentage")
						workflow.nodes[i].widgets_values[0] = "%(x, y, width, height)";
				} else if (workflow.nodes[i].type === "0246.ScriptNode") {
					if (
						workflow.nodes[i].widgets_values[2] === "pin_highway_deep" ||
						workflow.nodes[i].widgets_values[2] === "pin_highway_flat"
					)
						workflow.nodes[i].widgets_values[2] = "pin_highway";
				}
		}
	} else {
		if (PATCH_SIG.includes(1))
			for (let i = 0; i < app.graph._nodes.length; ++ i)
				if (app.graph._nodes[i].type === "jtong.Highway" || app.graph._nodes[i].type === "0246.HighwayBatch") {
					for (let j = 0; j < app.graph._nodes[i].widgets.length; ++ j)
						if (app.graph._nodes[i].widgets[j].name === "Update") {
							app.graph._nodes[i].widgets[j].callback();
							break;
						}
				}
		window.setTimeout(() => {
			if (PATCH_SIG.includes(2)) {
				for (let i = 0; i < app.graph._nodes.length; ++ i) {
					// if (app.graph._nodes[i].type === "0246.ScriptNode")
					// 	for (let j = 0; j < app.graph._nodes[i].outputs.length; ++ j)
					// 		app.graph._nodes[i].disconnectOutput(j);
					for (let j = 0; j < patch_node_db_0_0_3.length; ++ j)
						if (app.graph._nodes[i].type === patch_node_db_0_0_3[j][1])
							app.graph._nodes[i].setSize([app.graph._nodes[i].size[0], app.graph._nodes[i].computeSize()[1]]);
				}
				lib0246.error_popup(lib0246.indent_str `
					Recent update have 0246.ScriptNode (formerly 0246.ScriptImbue) have it output changed due to bad design.
					Please reconnect all output to desired node manually.

					Also remember to check for all 0246.ScriptRule if they have intended data.
				`);
			}
		}, 0);
	}
});

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
