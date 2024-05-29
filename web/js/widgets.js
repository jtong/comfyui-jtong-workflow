export const HELP = {
	"highway": `
		<span>
			The _query syntax goes as follow:
		</span>
		<ul>
			<li>
				<code>&gt;name</code>
				<br>
				- Input variable.
			</li>
			<li>
				<code>&lt;name</code>
				<br>
				- Output variable.
			</li>
			<li>
				<code>&gt;\`n!ce n@me\`</code>
				<br>
				-	Input variable but with special character and spaces (except \`, obviously).
			</li>
			<li>
				<code>!name</code>
				<br>
				- Output variable, but also delete itself, preventing from being referenced further.
				<br>
				- CURRENTLY BROKEN DUE TO HOW COMFYUI UPDATE THE NODES.
			</li>
			<li>
				<code>&lt;name1; &gt;name2; !name3</code>
				<br>
				- Multiple input and outputs together.
			</li>
		</ul>
	`.replace(/[\t\n]+/g, ''),
};

import { app, ANIM_PREVIEW_WIDGET } from "../../../scripts/app.js";

import * as lib0246 from "./utils.js";

export let defs, node_defs = [], combo_defs = [], type_defs = new Set();

let rgthree_utils;
lib0246.hijack(app, "registerNodesFromDefs", async function (_defs) {
	if (!this.mark && !Array.isArray(type_defs)) {
		defs = _defs;

		for (let key in defs) {
			node_defs.push(key);
			for (let idx in defs[key].output)
				if (!Array.isArray(defs[key].output[idx]))
					type_defs.add(defs[key].output[idx]);
			for (let idx in defs[key].input)
				for (let type in defs[key].input[idx])
					if (Array.isArray(defs[key].input[idx][type][0]))
						combo_defs.push([key, idx, type]);
		}

		type_defs = [...type_defs.values()];
	}
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function init_update_raw(node, widget, callback) {
	if (node.__update || !node.__hash_update)
		node.__hash_update = lib0246.random_id();
	node.__update = false;
	const temp = {
		data: widget.value,
		update: node.__hash_update,
	};
	if (callback)
		await callback(node, widget, temp);
	return temp;
}

function init_update(node, name) {
	node.__update = false;
	for (let i = 0; i < node.widgets.length; ++ i) {
		if (node.widgets[i].name === name) {
			node.widgets[i].serializeValue = async function (inner_node, index_str) {
				return await init_update_raw(node, node.widgets[i]);
			};
			return;
		}
	}
}
const BLACKLIST = [
	"_way_in",
	"_way_out",
	"_junc_in",
	"_junc_out",
	"_pipe_in",
	"_pipe_out",
	"_query",
	"_offset",
	"_event",
	"_delimiter",
	"_script_in",
	"_script_out",
	"_exec_mode",
	"_sort_mode",
	"_mode",
	"_pad",
	"_data",
	"_cloud_in",
	"_cloud_out",
	"..."
];

function expand_blacklist_func(mode, name) {
	if (this.mark && this.res !== true)
		this.res = BLACKLIST.includes(name);
}

const LEGACY_BLACKLIST = {
	prev: ["_pipe_in", "_pipe_out"],
	next: ["_way_in", "_way_out"],
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const INIT_MARK = Symbol("init");

export function highway_impl(nodeType, nodeData, app, shape_in, shape_out) {
	nodeType.prototype.onNodeMoved = function () {};

	lib0246.hijack(nodeType.prototype, "onConnectExpand", expand_blacklist_func);

	nodeType.prototype.onNodeCreated = function () {
		init_update(this, "_query");

		const query = this.widgets.find(w => w.name === "_query");

		query.options = query.options ?? {};
		query.options.multiline = true;

		let last_query = "";
		
		lib0246.hijack(this, "configure", function (data) {
			if (this.mark) {
				// Patch legacy nodes
				for (let i = 0; i < this.self.inputs.length; ++ i) {
					if (LEGACY_BLACKLIST.prev.includes(this.self.inputs[i].name))
						this.self.inputs[i].name = LEGACY_BLACKLIST.next[i];
				}
				for (let i = 0; i < this.self.outputs.length; ++ i) {
					if (LEGACY_BLACKLIST.prev.includes(this.self.outputs[i].name))
					this.self.outputs[i].name = LEGACY_BLACKLIST.next[i];
				}
				last_query = data.widgets_values[0];
			}
		});

		lib0246.hijack(this, "clone", function () {
			if (this.mark) {
				const node = this.res;
				// Clean up when copy paste or template load
				for (let i = 0; i < node.inputs.length; ++ i)
					if (!node?.onConnectExpand?.("clone_highway_input", node.inputs[i].name, i)) {
						node.inputs[i].name = app.graph.extra["0246.__NAME__"][this.self.id]["inputs"][i]["name"];
						node.inputs[i].type = "*";
					}
				for (let i = 0; i < node.outputs.length; ++ i)
					if (!node?.onConnectExpand?.("clone_highway_output", node.outputs[i].name, i)) {
						node.outputs[i].name = app.graph.extra["0246.__NAME__"][this.self.id]["outputs"][i]["name"];
						node.outputs[i].type = "*";
					}
				node.computeSize();
			}
		});

		this.addWidget("button", "Update", null, () => {
			const self = this;

			(async function () {
				let data = await (await fetch(
					window.location.origin + "/0246-parse-highway",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							"input": query.value,
						}),
					}
				)).json();

				if (!data) {
					lib0246.error_popup("Server or Network error");
					return;
				}

				if (data.error.length > 0) {
					lib0246.error_popup(data.error.join("\n"));
					query.value = last_query;
					return;
				}

				last_query = query.value;

				save_parse_load_pin(self, shape_in, shape_out, (node, prev, mode) => {
					if (mode) {
						for (let i = 0; i < data.order.length; ++ i) {
							switch (data.order[i][0]) {
								case "get":{
									node.addOutput(`-${data.order[i][1]}`, "*");
								} break;
								case "eat": {
									node.addOutput(`!${data.order[i][1]}`, "*");
								} break;
							}
						}
					} else {
						for (let i = 0; i < data.order.length; ++ i) {
							switch (data.order[i][0]) {
								case "set": {
									node.addInput(`+${data.order[i][1]}`, "*");
								} break;
							}
						}
					}
				});

				// node_fit(self, query, self.widgets.filter(_ => _.name === "Update")[0]);
			})();
		}, {
			serialize: false
		});

		this.onConnectInput = function (
			this_target_slot_index,
			other_origin_slot_type,
			other_origin_slot_obj,
			other_origin_node,
			other_origin_slot_index
		) {
			this.__update = true;

			if (this?.onConnectExpand?.("connect_highway_input", this.inputs[this_target_slot_index].name, ...arguments))
				return true;

			if (this.inputs[this_target_slot_index].link !== null) {
				// Prevent premature link kill
				app.graph.links[this.inputs[this_target_slot_index].link].replaced = true;
				return true;
			}
			
			let curr_pin = this.inputs[this_target_slot_index];
			if (app.graph.extra["0246.__NAME__"][this.id]["inputs"][this_target_slot_index]["type"] === "*")
				curr_pin.type = other_origin_slot_obj.type;
			curr_pin.name = `${app.graph.extra["0246.__NAME__"][this.id]["inputs"][this_target_slot_index]["name"]}:${curr_pin.type}`;

			return true;
		};

		this.onConnectOutput = function (
			this_origin_slot_index,
			other_target_slot_type,
			other_target_slot_obj,
			other_target_node,
			other_target_slot_index
		) {
			// We detect if we're connecting to Reroute here by checking other_target_node.type === "Reroute"
			// return false for not allowing connection
			this.__update = true;
			
			if (this?.onConnectExpand?.("connect_highway_output", this.outputs[this_origin_slot_index].name, ...arguments))
				return true;

			let curr_pin = this.outputs[this_origin_slot_index];

			if (app.graph.extra["0246.__NAME__"][this.id]["outputs"][this_origin_slot_index]["type"] === "*") {
				if (other_target_node.__outputType) // Reroute
					curr_pin.type = other_target_node.__outputType;
				else if (other_target_node.defaultConnectionsLayout) // Reroute (rgthree)
					// rgthree accept this anyways so whatever since too lazy to properly do graph traversal
					// EDIT: I was wrong, I have to do it, but not here :(
					curr_pin.type = other_target_slot_obj.type; 
				else
					curr_pin.type = other_target_slot_obj.type;
			}

			curr_pin.name = `${curr_pin.type}:${app.graph.extra["0246.__NAME__"][this.id]["outputs"][this_origin_slot_index]["name"]}`;

			return true;
		};

		this.onConnectionsChange = function (type, index, connected, link_info) {
			if (link_info === null) {
				this[INIT_MARK] = true;
				return;
			}

			if (!connected) {
				switch (type) {
					case 1: {
						if (
							this?.onConnectExpand?.("connection_change_remove_highway_input", this.inputs[link_info.target_slot].name, ...arguments) ||
							link_info.replaced
						)
							return;
						const curr_data = app.graph.extra?.["0246.__NAME__"]?.[this.id]?.["inputs"]?.[link_info.target_slot];
						this.inputs[link_info.target_slot].name = curr_data?.["name"] ?? this.inputs[link_info.target_slot].name;
						if (curr_data?.["type"] === "*" || !app.graph.extra["0246.__NAME__"])
							this.inputs[link_info.target_slot].type = "*";
					} break;
					case 2: {
						if (
							this.outputs[link_info.origin_slot].links.length === 0 && 
							!this?.onConnectExpand?.("connection_change_remove_highway_output", this.outputs[link_info.origin_slot].name, ...arguments)
						) {
							const curr_data = app.graph.extra?.["0246.__NAME__"]?.[this.id]?.["outputs"]?.[link_info.origin_slot];
							this.outputs[link_info.origin_slot].name = curr_data?.["name"] ?? this.outputs[link_info.origin_slot].name;
							if (curr_data?.["type"] === "*" || !app.graph.extra["0246.__NAME__"])
								this.outputs[link_info.origin_slot].type = "*";
						}
					} break;
					default: {
						throw new Error("Unsuported type: " + type);
					}
				}
			}
		};

		lib0246.hijack(this, "onAdded", function () {
			if (this.mark && this.self[INIT_MARK]) {
				delete this.self[INIT_MARK];
				this.self.widgets.find(w => w.name === "Update").callback();
				return;
			}
		});

		lib0246.hijack(this, "onRemoved", function () {
			if (!this.mark) {
				app.graph.extra["0246.__NAME__"] = app.graph.extra["0246.__NAME__"] ?? {};
				delete app.graph.extra["0246.__NAME__"][this.self.id];
			}
		});
	};

	lib0246.hijack(nodeType.prototype, "getExtraMenuOptions", function (canvas, options) {
		// canvas === app.canvas
		
		// value: parent submenu obj
		// options: this.extra == node, scroll_speed, event: litegraph event
		// evt: native event object
		// menu
		// node
		if (!this.mark) {
			options.push(
				{
					content: "[0246.Highway] Selected node pins -> highway pins",
					callback: (value, options, evt, menu, node) => {
						for (let node_id in app.canvas.selected_nodes) {
							if (node.id === Number(node_id))
								continue;
							save_parse_load_pin(node, shape_in, shape_out, (node, prev, mode) => {
								const from = app.graph.getNodeById(Number(node_id));
								if (mode) {
									copy_output_pin(node, from, "output", "<");
								} else {
									if (defs[from.comfyClass]?.input?.required)
										copy_input_pin(node, from, "input", "input", "required", ">");
									if (defs[from.comfyClass]?.input?.optional)
										copy_input_pin(node, from, "input", "input", "optional", ">");
								}
							});
						}
					}
				},
				{
					content: "[0246.Highway] Selected node pins -> highway pins (inverse)",
					callback: (value, options, evt, menu, node) => {
						for (let node_id in app.canvas.selected_nodes) {
							if (node.id === Number(node_id))
								continue;
							save_parse_load_pin(node, shape_in, shape_out, (node, prev, mode) => {
								const from = app.graph.getNodeById(Number(node_id));
								if (!mode) {
									copy_output_pin(node, from, "input", ">");
								} else {
									if (defs[from.comfyClass]?.input?.required)
										copy_input_pin(node, from, "input", "output", "required", "<");
									if (defs[from.comfyClass]?.input?.optional)
										copy_input_pin(node, from, "input", "output", "optional", "<");
								}
							});
						}
					}
				},
				{
					content: "[0246.Highway] Selected node pins -> highway _query",
					callback: (value, options, evt, menu, node) => {
						for (let node_id in app.canvas.selected_nodes) {
							if (node.id === Number(node_id))
								continue;
							const query = node.widgets.find(w => w.name === "_query"),
								from = app.graph.getNodeById(Number(node_id));
							query.value = "";
							if (defs[from.comfyClass]?.input?.required)
								querify_input_pin(query, from, "required", ">");
							if (defs[from.comfyClass]?.input?.optional)
								querify_input_pin(query, from, "optional", ">");
							querify_output_pin(query, from, "<");
						}
					}
				},
				{
					content: "[0246.Highway] Selected node pins -> highway _query (inverse)",
					callback: (value, options, evt, menu, node) => {
						for (let node_id in app.canvas.selected_nodes) {
							if (node.id === Number(node_id))
								continue;
							const query = node.widgets.find(w => w.name === "_query"),
								from = app.graph.getNodeById(Number(node_id));
							query.value = "";
							if (defs[from.comfyClass]?.input?.required)
								querify_input_pin(query, from, "required", "<");
							if (defs[from.comfyClass]?.input?.optional)
								querify_input_pin(query, from, "optional", "<");
							querify_output_pin(query, from, ">");
						}
					}
				},
			);

			// HTML format of help
			options.push(null);
		}
	});

	// rgthree_exec("addConnectionLayoutSupport", nodeType, app);
}

function save_parse_load_pin(node, shape_in, shape_out, callback) {
	node.__update = true;

	let prev = [];

	// Save previous inputs and outputs
	if (node.inputs) {
		for (let i = 0; i < node.inputs.length; ++ i) {
			if (
				!node?.onConnectExpand?.("save_parse_load_pin_save_input", node.inputs[i].name, i) &&
				node.inputs[i].link !== null
			)
				prev.push({
					flag: false,
					name: app.graph.extra?.["0246.__NAME__"]?.[node.id]?.["inputs"]?.[i]?.["name"] ?? null,
					node_id: app.graph.links[node.inputs[i].link].origin_id,
					slot_id: app.graph.links[node.inputs[i].link].origin_slot,
					this_id: i
				});
		}

		for (let i = node.inputs.length; i -- > 0;) {
			if (!node?.onConnectExpand?.("save_parse_load_pin_remove_input", node.inputs[i].name, i))
				node.removeInput(i);
		}

		callback(node, prev, false);

		for (let i = 0; i < node.inputs.length; ++ i) {
			app.graph.extra["0246.__NAME__"] = app.graph.extra["0246.__NAME__"] ?? {};
			app.graph.extra["0246.__NAME__"][node.id] = app.graph.extra["0246.__NAME__"][node.id] ?? {
				inputs: {},
				outputs: {},
			};
			app.graph.extra["0246.__NAME__"][node.id].inputs[i] = app.graph.extra["0246.__NAME__"][node.id].inputs[i] ?? {};
			app.graph.extra["0246.__NAME__"][node.id].inputs[i].name = node.inputs[i].name;
			app.graph.extra["0246.__NAME__"][node.id].inputs[i].type = node.inputs[i].type;
			if (!node?.onConnectExpand?.("save_parse_load_pin_load_input", node.inputs[i].name, i))
				node.inputs[i].shape = shape_in;
		}
	}

	if (node.outputs) {
		for (let i = 0; i < node.outputs.length; ++ i) {
			if ((
				!node?.onConnectExpand?.("save_parse_load_pin_save_output", node.outputs[i].name, i)
			) && node.outputs[i].links !== null)
				for (let j = 0; j < node.outputs[i].links.length; ++ j)
					prev.push({
						flag: true,
						name: app.graph.extra?.["0246.__NAME__"]?.[node.id]?.["outputs"]?.[i]?.["name"] ?? null,
						node_id: app.graph.links[node.outputs[i].links[j]].target_id,
						slot_id: app.graph.links[node.outputs[i].links[j]].target_slot,
						this_id: i
					});
		}

		for (let i = node.outputs.length; i -- > 0;) {
			if (!node?.onConnectExpand?.("save_parse_load_pin_remove_output", node.outputs[i].name, i))
				node.removeOutput(i);
		}

		callback(node, prev, true);

		for (let i = 0; i < node.outputs.length; ++ i) {
			app.graph.extra["0246.__NAME__"] = app.graph.extra["0246.__NAME__"] ?? {};
			app.graph.extra["0246.__NAME__"][node.id] = app.graph.extra["0246.__NAME__"][node.id] ?? {
				inputs: {},
				outputs: {},
			};
			app.graph.extra["0246.__NAME__"][node.id].outputs[i] = app.graph.extra["0246.__NAME__"][node.id].outputs[i] ?? {};
			app.graph.extra["0246.__NAME__"][node.id].outputs[i].name = node.outputs[i].name;
			app.graph.extra["0246.__NAME__"][node.id].outputs[i].type = node.outputs[i].type;
			if (!node?.onConnectExpand?.("save_parse_load_pin_load_output", node.outputs[i].name, i))
				node.outputs[i].shape = shape_out;
		}
	}

	// Restore previous inputs and outputs
	for (let i = 0; i < prev.length; ++ i) {
		// Check if input/output still exists
		if (prev[i].flag) {
			if (prev[i].name === null)
				node.connect(
					prev[i].this_id,
					prev[i].node_id,
					prev[i].slot_id
				);
			else for (let j = 0; j < node.outputs.length; ++ j) {
				if (app.graph.extra["0246.__NAME__"][node.id]["outputs"][j]["name"].slice(0) === prev[i].name.slice(0)) {
					node.connect(
						j,
						prev[i].node_id,
						prev[i].slot_id
					);
					break;
				}
			}
		} else {
			if (prev[i].name === null)
				app.graph.getNodeById(prev[i].node_id).connect(
					prev[i].slot_id,
					node,
					prev[i].this_id
				);
			else for (let j = 0; j < node.inputs.length; ++ j) {
				if (app.graph.extra["0246.__NAME__"][node.id]["inputs"][j]["name"].slice(1) === prev[i].name.slice(1)) {
					app.graph.getNodeById(prev[i].node_id).connect(
						prev[i].slot_id,
						node,
						j
					);
					break;
				}
			}
		}
	}
}

function copy_input_pin(node, from, kind, to_kind, path, ops) {
	const kind_upper = to_kind.charAt(0).toUpperCase() + to_kind.slice(1);
	for (let name in defs[from.comfyClass][kind][path])
		node["add" + kind_upper](
			`${ops}${name}`,
			Array.isArray(defs[from.comfyClass][kind][path][name][0]) ?
				"STRING" : // COMBO is STRING internally anyways
				defs[from.comfyClass][kind][path][name][0]
		);
}

function querify_input_pin(widget, from, path, ops) {
	for (let name in defs[from.comfyClass].input[path])
		widget.value += `${ops}${name};`;
}

function copy_output_pin(node, from, kind, ops) {
	const kind_upper = kind.charAt(0).toUpperCase() + kind.slice(1);
	for (let i = 0; i < defs[from.comfyClass].output_name.length; ++ i)
		node["add" + kind_upper](
			`${ops}${defs[from.comfyClass].output_name[i]}`,
			Array.isArray(defs[from.comfyClass].output[i]) ?
				"STRING" :
				defs[from.comfyClass].output[i]
		);
}

function querify_output_pin(widget, from, ops) {
	for (let i = 0; i < defs[from.comfyClass].output_name.length; ++ i)
		widget.value += `${ops}${defs[from.comfyClass].output_name[i]};`;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function process_reroute(node, type) {
	type = type ?? node.widgets[0].value;
	node.size[0] = 100 + type.length * 8;
	node.inputs[0].type = type;
	node.outputs[0].type = type;
	node.__outputType = type;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

