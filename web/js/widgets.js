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
function calc_flex(node, width) {
	node.flex_data = node.flex_data ?? {};
	node.flex_data.share_count = 0;
	node.flex_data.share_weight = [];
	node.flex_data.share_min_h = [];
	node.flex_data.share_max_h = [];
	node.flex_data.off_h = 0;
	node.flex_data.left_h = 0;
	node.flex_data.dom_h = 0; // For native dom widget is supported
	node.flex_data.img_h = node.flex_data.img_h ?? 0;
	for (let i = 0; i < node.widgets.length; ++ i)
		if (node.widgets[i]?.flex) {
			if (node.widgets[i]?.type === "converted-widget")
				continue;
			node.flex_data.share_weight.push(node.widgets[i]?.flex?.share);
			node.flex_data.share_min_h.push(Number.isFinite(node.widgets[i]?.flex?.real_min_h) && node.widgets[i]?.flex?.real_min_h > 0 ? node.widgets[i]?.flex?.real_min_h : null);
			node.flex_data.share_max_h.push(Number.isFinite(node.widgets[i]?.flex?.real_max_h) && node.widgets[i]?.flex?.real_max_h > 0 ? node.widgets[i]?.flex?.real_max_h : null);
			++ node.flex_data.share_count;
			node.widgets[i].flex.index = node.flex_data.share_count - 1;
			node.flex_data.left_h += 4;
		} else
			node.flex_data.off_h += (node.widgets[i]?.computedHeight ?? node.widgets[i]?.computeSize?.(width ?? LiteGraph.NODE_WIDGET_WIDTH)?.[1] ?? LiteGraph.NODE_WIDGET_HEIGHT) + 4;
	node.flex_data.slot_c = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
	node.widgets_start_y = node.flex_data.slot_c === 0 ? 14 : null;
	node.flex_data.slot_h = Math.max(1, node.flex_data.slot_c) * LiteGraph.NODE_SLOT_HEIGHT;
	node.flex_data.take_h = node.flex_data.off_h + node.flex_data.left_h + node.flex_data.slot_h + 8 + 6;
	node.size[1] = Math.max(
		node.flex_data.share_min_h.reduce((a, b) => a + b, node.flex_data.take_h + node.flex_data.img_h),
		(app.canvas.resizing_node === node) ? app.canvas.graph_mouse[1] - node.pos[1] : node.size[1]
	);
}

let PROCESS_WIDGET_NODE;

export function widget_flex(node, widget, options = {}) {
	widget.flex = {};

	lib0246.hijack(widget, "mouse", function (event, pos, evt_node) {
		if (!this.mark) {
			if (evt_node !== node) {
				// [TODO] Figure out why this does not work
				// this.self.flex.hold_mouse[0] = this.self.flex.margin_x;
				// this.self.flex.hold_mouse[1] = this.self.flex.real_y - 2;
				// this.self.flex.hold_mouse[2] = this.self.flex.real_w - this.self.flex.margin_x * 2;
				// this.self.flex.hold_mouse[3] = this.self.flex.temp_h - 2;
				this.self.flex.hold_mouse = this.self.flex.hold_draw;
			} else
				lib0246.calc_area(
					this.self.flex.margin_x, this.self.flex.margin_head_y, this.self.flex.margin_tail_real_y,
					this.self.flex.real_w, this.self.flex.real_h, this.self.flex.real_max_h,
					this.self.flex.ratio, this.self.flex.center, (this.self.flex.real_y ?? 0),
					true, this.self.flex.hold_mouse
				);
		}
	});

	lib0246.hijack(widget, "draw", function (ctx, draw_node, widget_width, y, widget_height) {
		if (!this.mark) {
			this.self.flex.real_y = y;
			this.self.flex.real_w = widget_width;

			if (draw_node !== node) {
				this.self.flex.hold_draw[0] = this.self.flex.margin_x;
				this.self.flex.hold_draw[1] = this.self.flex.real_y - 2;
				this.self.flex.hold_draw[2] = widget_width - this.self.flex.margin_x * 2;
				this.self.flex.hold_draw[3] = this.self.flex.temp_h - 2;
			} else {
				lib0246.calc_area(
					this.self.flex.margin_x, this.self.flex.margin_head_y, this.self.flex.margin_tail_real_y,
					widget_width, this.self.flex.real_h,
					this.self.flex.real_max_h,
					this.self.flex.ratio, this.self.flex.center, this.self.flex.real_y,
					true, this.self.flex.hold_draw
				);
			}
		}
	});

	lib0246.hijack(widget, "computeSize", function (width) {
		if (!this.mark) {
			this.self.flex.temp_h = 0;
			if (PROCESS_WIDGET_NODE && PROCESS_WIDGET_NODE.isPointInside(app.canvas.graph_mouse[0], app.canvas.graph_mouse[1])) {
				// Intentional double-ifs
				if (PROCESS_WIDGET_NODE !== node) {
					// [TODO] Maybe somehow find a way to use hold_size since it technically more correct
					this.res = [width, this.self.flex.hold_draw[3]];
					this.self.last_y = this.self.flex.real_y + this.self.flex.margin_head_y;
					this.stop = true;
					return;
				}
			}
	
			// Don't ask why how I came up with this. This took a week of brain power.
			this.self.flex.real_y = this.self.flex.real_y ?? 0;
			this.self.flex.margin_tail_real_y = this.self.flex.margin_tail_y;
			this.self.flex.real_max_h = Infinity;
			this.self.flex.real_min_h = this.self.flex.min_h ?? 0;

			// dom_flag = width === undefined
			if (!node.flex_data)
				calc_flex(node, width);
			
			if (!node.imgs || node.widgets.find(_ => _.name === ANIM_PREVIEW_WIDGET))
				node.flex_data.img_h = 0;

			// [TODO] Caching this?
			this.self.flex.real_h = lib0246.calc_spread(
				node.flex_data.share_count,
				node.size[1] - node.flex_data.take_h - node.flex_data.img_h,
				node.flex_data.share_weight,
				node.flex_data.share_min_h,
				node.flex_data.share_max_h
			)[this.self.flex.index];
	
			this.self.flex.temp_h += this.self.flex.real_h;
			this.self.computedHeight = this.self.flex.temp_h;
	
			this.res = [width, this.self.flex.temp_h];
			this.stop = true;
		}
	});

	if (!node.computeSize[lib0246.HIJACK_MARK]) {
		lib0246.hijack(node, "computeSize", function () {
			const node = this.self;
			if (!this.mark) {
				if (!node.size) {
					this.stop = true;
					this.res = [LiteGraph.NODE_MIN_WIDTH, 100];
					return;
				}
				calc_flex(node, node.size[0]);
			}
		});

		lib0246.hijack(node, "setSize", function (size) {
			const node = this.self;
			if (!this.mark && Number.isFinite(node?.flex_data?.force_h)) {
				size[1] = node.flex_data.force_h;
				node.flex_data.force_h = null;
			}
		});

		lib0246.hijack(node, "setSizeForImage", function (force) {
			if (!this.mark) {
				if (!force && this.self.animatedImages) return;
				this.self.flex_data.img_h = 220;
				this.self.flex_data.force_h = this.self.size[1];
			}
		});

		lib0246.hijack(node, "onComputeVisible", function () {
			if (this.mark && node?.flex_data && !node?.flex_data?.init) {
				node.flex_data.init = true;
				this.res = true;
			}
		});
	}

	widget.flex.hold_draw = [];
	widget.flex.hold_mouse = [];
	widget.flex.hold_size = [];

	widget.flex.margin_x = options.margin_x ?? 20;
	widget.flex.margin_head_y = options.margin_head_y ?? 0;
	widget.flex.margin_tail_y = options.margin_tail_y ?? 0;
	widget.flex.min_h = options.min_h ?? 0;
	widget.flex.max_h = options.max_h ?? Infinity;
	widget.flex.ratio = options.ratio ?? 0;
	widget.flex.share = options.share ?? false;
	widget.flex.center = options.center ?? true;

	widget.options = widget.options ?? {};
	widget.options.getHeight = function () {
		return this.self.flex.real_h;
	};
}

const DOM_NODE_DB = new Set(), DOM_RESIZE_MARK = Symbol("dom_resize");

export function DOM_WIDGET(data_type, data_name, element, options = {}) {
	Object.assign(options, {
		hideOnZoom: true,
		selectOn: ["focus", "click"],
	});

	const widget = {
		name: data_name,
		type: data_type,
		get value() {
			return this.options.getValue?.();
		},
		set value(value) {
			this.options.setValue?.(value);
			this.callback?.(value);
		},
		draw: function (ctx, node, widget_width, y, widget_height) {
			const hidden =
				node.flags?.collapsed ||
				(!!options.hideOnZoom && app.canvas.ds.scale < 0.5) ||
				widget.flex.hold_draw[3] <= 0 ||
				widget.type === "converted-widget";
			this.element.hidden = hidden;
			this.element.style.display = hidden ? "none" : "";
			if (hidden) {
				widget.options.onHide?.(widget);
				return;
			}

			const elem_rect = ctx.canvas.getBoundingClientRect(),
				transform = new DOMMatrix()
					.scaleSelf(elem_rect.width / ctx.canvas.width, elem_rect.height / ctx.canvas.height)
					.multiplySelf(ctx.getTransform())
					.translateSelf(widget.flex.hold_draw[0], widget.flex.hold_draw[1]);

			Object.assign(this.element.style, {
				transformOrigin: "0 0",
				transform: new DOMMatrix().scaleSelf(transform.a, transform.d),
				left: `${transform.a + transform.e}px`,
				top: `${transform.d + transform.f}px`,
				width: `${widget.flex.hold_draw[2]}px`,
				height: `${widget.flex.hold_draw[3]}px`,
				position: "absolute",
				zIndex: app.graph._nodes.indexOf(node),
			});

			// [TODO]
			// if (app.ui.settings.getSettingValue("Comfy.DOMClippingEnabled", false)) {
			// 	this.element.style.clipPath = lib0246.clip_path(node, element, elRect);
			// 	this.element.style.willChange = "clip-path";
			// }

			this.options.onDraw?.(widget);
		},
		onAdd(node, flag = false) {
			const widget = this;
			if (!widget.element.parentElement)
				document.body.append(widget.element);

			if (!flag) {
				DOM_NODE_DB.add(node);
				if (widget.element.blur) {
					widget.mouse_dom = function (event) {
						if (!widget.element.contains(event.target))
							widget.element.blur();
					};
					document.addEventListener("mousedown", widget.mouse_dom);
				}

				for (const evt of widget.options.selectOn) {
					widget.element.addEventListener(evt, () => {
						app.canvas.selectNode(node);
						app.canvas.bringToFront(node);
					});
				}

				lib0246.hijack(node, "collapse", function () {
					if (this.mark && this.self.flags?.collapsed) {
						widget.element.hidden = true;
						widget.element.style.display = "none";
					}
				});

				lib0246.hijack(node, "onRemoved", function () {
					// widget.element.remove();
					if (!this.mark) {
						widget.onRemove();
						DOM_NODE_DB.delete(this.self);
					}
				});

				if (!node[DOM_RESIZE_MARK]) {
					node[DOM_RESIZE_MARK] = true;
					lib0246.hijack(node, "onResize", function (size) {
						if (this.mark) {
							widget.options.beforeResize?.call(widget, this);
							widget.computeSize(size[0]);
							widget.options.afterResize?.call(widget, this);
						}
					});
				}
			}
		},
		onRemove(flag = false) {
			if (this.mouse_dom && !flag)
				document.removeEventListener("mousedown", this.mouse_dom);
			this.element.remove();
		},
		element,
		options,
	};

	return widget;
}

lib0246.hijack(LGraphNode.prototype, "addDOMWidget", function (name, type, element, options = {}) {
	if (!this.mark && app.ui.settings.getSettingValue("0246.AlternateDOMWidget", false)) {
		options.flex = options.flex ?? {};
		options.flex.ratio = options?.flex?.ratio ?? 0;
		options.flex.share = options?.flex?.share ?? 1;
		options.flex.min_h = options?.flex?.min_h ?? 30;
		options.flex.center = options?.flex?.center ?? true;
		options.flex.margin_x = options?.flex?.margin_x ?? 10;

		const widget = DOM_WIDGET(type, name, element, options);
		this.self.addCustomWidget(widget);
		widget_flex(this.self, widget, options.flex);
		widget.onAdd(this.self, false);
		widget.options.flex = options.flex;
		this.stop = true;
		this.res = widget;
	}
});

lib0246.hijack(LGraphCanvas.prototype, "computeVisibleNodes", function () {
	if (this.mark)
		for (const node of app.graph._nodes) {
			if (node?.onComputeVisible?.())
				this.res.push(node);
			if (node.flex_data || DOM_NODE_DB.has(node)) {
				const hidden = this.res.indexOf(node) === -1 || node.flags?.collapsed;
				for (const w of node.widgets)
					if (w.element) {
						w.element.hidden = hidden;
						w.element.style.display = hidden ? "none" : "";
						if (hidden)
							w.options.onHide?.(w);
					}
			}
		}
});

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

