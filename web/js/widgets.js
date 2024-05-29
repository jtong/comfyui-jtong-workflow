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

function eval_state(db, state, node, widget, event, pos) {
	for (let i = 0; i < db.length; i += 2) {
		if (Array.isArray(db[i])) {
			for (let j = 0; j < db[i].length; ++ j)
				if (lib0246.equal_dict(state, db[i][j], true, "*")) {
					lib0246.update_dict(state, db[i + 1](node, widget, event, pos) ?? {});
					return;
				}
			continue;
		} else if (lib0246.equal_dict(state, db[i], true, "*")) {
			lib0246.update_dict(state, db[i + 1](node, widget, event, pos) ?? {});
			return;
		}
	}
}

function reset_state(state) {
	delete state.mouse;
	delete state.where;
	delete state.action;
	delete state.select;
	delete state.bound;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function box_range_eval_corner(pos, curr_box, widget) {
	if (lib0246.is_inside_circ(
		pos[0], pos[1],
		curr_box[8] + curr_box[10], curr_box[9], widget.box_range.radius
	)) {
		// Intentionally prioritize top right
		widget.box_range.state.where = "tr";
		return true;
	} else if (lib0246.is_inside_circ(
		pos[0], pos[1],
		curr_box[8], curr_box[9], widget.box_range.radius
	)) {
		widget.box_range.state.where = "tl";
		return true;
	} else if (lib0246.is_inside_circ(
		pos[0], pos[1],
		curr_box[8], curr_box[9] + curr_box[11], widget.box_range.radius
	)) {
		widget.box_range.state.where = "bl";
		return true;
	} else if (lib0246.is_inside_circ(
		pos[0], pos[1],
		curr_box[8] + curr_box[10], curr_box[9] + curr_box[11], widget.box_range.radius
	)) {
		widget.box_range.state.where = "br";
		return true;
	}
	return false;
}

function box_range_process_del(widget) {
	let index = widget.box_range.boxes.indexOf(widget.box_range.select[widget.box_range.select.length - 1]);
	if (index !== -1)
		widget.box_range.boxes.splice(index, 1);
	widget.box_range.select.length = 0;
	widget.box_range.delay_state = null;
}

function box_range_grid_snap(pos, widget) {
	pos[0] = lib0246.lerp(
		lib0246.snap(
			lib0246.norm(pos[0], widget.flex.hold_mouse[0], widget.flex.hold_mouse[0] + widget.flex.hold_mouse[2]) + 1 / (widget.row_count * 2),
			1 / widget.row_count
		),
		widget.flex.hold_mouse[0], widget.flex.hold_mouse[0] + widget.flex.hold_mouse[2]
	);
	pos[1] = lib0246.lerp(
		lib0246.snap(
			lib0246.norm(pos[1], widget.flex.hold_mouse[1], widget.flex.hold_mouse[1] + widget.flex.hold_mouse[3]) + 1 / (widget.col_count * 2),
			1 / widget.col_count
		),
		widget.flex.hold_mouse[1], widget.flex.hold_mouse[1] + widget.flex.hold_mouse[3]
	);
}

const BOX_RANGE_STATE = [
	// Selection
	...[
		[
			{
				mouse: "pointerdown",
				where: "box",
				action: "",
				bound: "in"
			}, {
				mouse: "pointerdown",
				where: "box",
				action: "select",
				bound: "in"
			},
		], function (node, widget, event, pos) {
			widget.box_range.select_during = pos;
			widget.box_range.delay_state = window.performance.now();
			return {
				action: "select"
			};
		},

		[
			{
				mouse: "pointerup",
				where: "box",
				action: "select",
				bound: "in"
			}
		], function (node, widget, event, pos) {
			// [TODO] Maybe also perform delete for this state?
			let res;
			if (lib0246.equal_array(widget.box_range.select_during, pos, false)) {
				if (event.shiftKey && widget.box_range.select.length > 0) {
					let curr_box = widget.box_range.select[widget.box_range.select.length - 1];
					app.canvas.prompt("[x, y, width, height]", JSON.stringify(curr_box.slice(0, 4)), (value) => {
						try {
							const res = JSON.parse(value);
							if (res.length !== 4)
								return;
							for (let i = 0; i < 4; ++ i)
								if (typeof res[i] === "string") {
									try {
										const BOUND_X = widget.flex.hold_mouse[0],
											BOUND_Y = widget.flex.hold_mouse[1],
											BOUND_W = widget.flex.hold_mouse[2],
											BOUND_H = widget.flex.hold_mouse[3];
										res[i] = Number(eval(res[i]));
									} catch (e) {
										lib0246.error_popup("Invalid box range math expression format.");
										return;
									}
								} else if (!Number.isFinite(res[i]))
									res[i] = widget.flex.hold_mouse[i];
							if (lib0246.is_inside_rect_rect(
								res[0], res[1], res[2], res[3],
								widget.flex.hold_draw[0], widget.flex.hold_draw[1],
								widget.flex.hold_draw[2], widget.flex.hold_draw[3]
							)) {
								curr_box[0] = res[0];
								curr_box[1] = res[1];
								curr_box[2] = res[2];
								curr_box[3] = res[3];
							} else
								lib0246.error_popup("Provided range is outside of the boundary.");
						} catch (e) {
							const ratio_widget = node.widgets.find(w => w.name === "box_ratio");
							let size_box = curr_box.slice(4, 8);
							if (ratio_widget)
								size_box = [0, 0, ratio_widget.value.data.width, ratio_widget.value.data.height];
							try {
								let old_onmessage = window.onmessage;
								window.onmessage = () => {};
								lib0246.safe_eval(`
									function _ (x, y, w, h) {
										return calc_flex_norm(
											x, y, w, h,
											${size_box[0]}, ${size_box[1]}, ${size_box[2]}, ${size_box[3]},
											${widget.flex.hold_draw[0]}, ${widget.flex.hold_draw[1]},
											${widget.flex.hold_draw[2]}, ${widget.flex.hold_draw[3]}
										);
									}

									const CURR_X = ${size_box[0]},
										CURR_Y = ${size_box[1]},
										CURR_W = ${size_box[2]},
										CURR_H = ${size_box[3]},
										CODE = ${"`" + value + "`"};

									return ${value};
								`).then((res) => {
									if (!Array.isArray(res) || res.length !== 4) {
										lib0246.error_popup("Invalid box range data format. Expected [x, y, width, height].");
										return;
									}
									if (lib0246.is_inside_rect_rect(
										res[0], res[1], res[2], res[3],
										widget.flex.hold_draw[0], widget.flex.hold_draw[1],
										widget.flex.hold_draw[2], widget.flex.hold_draw[3]
									)) {
										curr_box[0] = res[0];
										curr_box[1] = res[1];
										curr_box[2] = res[2];
										curr_box[3] = res[3];

										curr_box[12] = res[0];
										curr_box[13] = res[1];
										curr_box[14] = res[2];
										curr_box[15] = res[3];

										curr_box[16] = size_box[0];
										curr_box[17] = size_box[1];
										curr_box[18] = size_box[2];
										curr_box[19] = size_box[3];
									} else
										lib0246.error_popup("Provided range is outside of the boundary.");
									window.onmessage = old_onmessage;
									app.canvas.setDirty(true);
								});
							} catch (e) {
								lib0246.error_popup(`Invalid box range expression format: ${e.message}`);
								return;
							}
						}
					}, event, true);
					res = {
						action: ""
					};
				} else {
					let select_list = [];
					for (let i = 0; i < widget.box_range.boxes.length; ++ i)
						if (lib0246.is_inside_rect(
							pos[0], pos[1],
							widget.box_range.boxes[i][8], widget.box_range.boxes[i][9],
							widget.box_range.boxes[i][10], widget.box_range.boxes[i][11]
						))
							select_list.push(widget.box_range.boxes[i]);

					if (lib0246.equal_array(widget.box_range.select, select_list, true))
						widget.box_range.select.push(widget.box_range.select.shift());
					else
						widget.box_range.select = select_list;
				}
			}
			widget.box_range.select_during = null;
			widget.box_range.delay_state = null;
			return res;
		}
	],

	
	// Box create
	...[
		[
			{
				mouse: "pointerdown",
				where: "",
				action: "",
				bound: "in"
			}, {
				mouse: "pointerdown",
				where: "",
				action: "select",
				bound: "in"
			}
		], function (node, widget, event, pos) {
			widget.box_range.begin_state = pos;
			widget.box_range.during_state = pos;
			widget.box_range.select.length = 0;
			widget.box_range.delay_state = null;
			return {
				action: "create"
			};
		},

		{
			mouse: "pointerup",
			where: "",
			action: "",
			bound: "in"
		}, function (node, widget, event, pos) {
			widget.box_range.select.length = 0;
			return {
				action: ""
			};
		},

		{
			mouse: "pointermove",
			action: "create",
			bound: "in"
		}, function (node, widget, event, pos) {
			widget.box_range.during_state = pos;
		},

		{
			mouse: "pointerup",
			action: "create",
			bound: "in"
		}, function (node, widget, event, pos) {
			widget.box_range.during_state = pos;

			// Check if equal then terminate early
			if (!lib0246.equal_array(widget.box_range.begin_state, widget.box_range.during_state, false)) {
				if (widget.box_range.begin_state[0] > widget.box_range.during_state[0]) {
					let temp = widget.box_range.begin_state[0];
					widget.box_range.begin_state[0] = widget.box_range.during_state[0];
					widget.box_range.during_state[0] = temp;
				}
				if (widget.box_range.begin_state[1] > widget.box_range.during_state[1]) {
					let temp = widget.box_range.begin_state[1];
					widget.box_range.begin_state[1] = widget.box_range.during_state[1];
					widget.box_range.during_state[1] = temp;
				}

				const width = Math.abs(widget.box_range.during_state[0] - widget.box_range.begin_state[0]),
					height = Math.abs(widget.box_range.during_state[1] - widget.box_range.begin_state[1]);

				if (event.shiftKey) {
					let old_length = widget.box_range.boxes.length;
					for (let i = 0; i < old_length; ++ i)
						if (lib0246.is_inside_rect_rect(
							widget.box_range.boxes[i][0], widget.box_range.boxes[i][1],
							widget.box_range.boxes[i][2], widget.box_range.boxes[i][3],
							widget.box_range.begin_state[0], widget.box_range.begin_state[1],
							width, height
						)) {
							widget.box_range.select.push(widget.box_range.boxes[i]);
							widget.box_range.boxes.splice(i --, 1);
							-- old_length;
						}
					widget.box_range.select.length = 0;
				} else
					widget.box_range.boxes.push([
						widget.box_range.begin_state[0],
						widget.box_range.begin_state[1],
						width, height,
						...widget.flex.hold_mouse,
						widget.box_range.begin_state[0],
						widget.box_range.begin_state[1],
						width, height,
					]);
			}

			widget.box_range.begin_state = null;
			widget.box_range.during_state = null;
			return {
				action: ""
			};
		},
	],

	// Box move
	...[
		[
			{
				mouse: "pointermove",
				where: "box",
				action: "select",
				bound: "in"
			}
		], function (node, widget, event, pos) {
			if (event.shiftKey)
				box_range_grid_snap(pos, widget);
			widget.box_range.begin_state = pos;
			widget.box_range.during_state = pos;
			widget.box_range.delay_state = null;

			if (widget.box_range.select.length === 0)
				return {
					action: "select"
				};
			return {
				action: "move"
			};
		},

		{
			mouse: "pointermove",
			action: "move",
			bound: "in"
		}, function (node, widget, event, pos) {
			widget.box_range.during_state = pos;
			if (event.shiftKey) {
				box_range_grid_snap(widget.box_range.begin_state, widget);
				box_range_grid_snap(widget.box_range.during_state, widget);
			}
		},

		{
			mouse: "pointerup",
			action: "move",
			bound: "in"
		}, function (node, widget, event, pos) {
			const curr_box = widget.box_range.select[widget.box_range.select.length - 1],
				res = lib0246.calc_flex_norm(
					curr_box[0], curr_box[1], curr_box[2], curr_box[3],
					curr_box[4], curr_box[5], curr_box[6], curr_box[7],
					widget.flex.hold_mouse[0], widget.flex.hold_mouse[1], widget.flex.hold_mouse[2], widget.flex.hold_mouse[3],
				);

			let new_x = res[0] + widget.box_range.during_state[0] - widget.box_range.begin_state[0],
				new_y = res[1] + widget.box_range.during_state[1] - widget.box_range.begin_state[1];
			
			if (!lib0246.is_inside_rect_rect(
				new_x, new_y, res[2], res[3],
				widget.flex.hold_mouse[0], widget.flex.hold_mouse[1],
				widget.flex.hold_mouse[2], widget.flex.hold_mouse[3]
			)) {
				// Champ back to range with a combination of min and max
				new_x = Math.max(
					Math.min(new_x, widget.flex.hold_mouse[0] + widget.flex.hold_mouse[2] - res[2]),
					widget.flex.hold_mouse[0]
				);
				new_y = Math.max(
					Math.min(new_y, widget.flex.hold_mouse[1] + widget.flex.hold_mouse[3] - res[3]),
					widget.flex.hold_mouse[1]
				);
			}

			curr_box[0] = res[0];
			curr_box[1] = res[1];
			curr_box[2] = res[2];
			curr_box[3] = res[3];
			
			curr_box[4] = widget.flex.hold_mouse[0];
			curr_box[5] = widget.flex.hold_mouse[1];
			curr_box[6] = widget.flex.hold_mouse[2];
			curr_box[7] = widget.flex.hold_mouse[3];

			curr_box[8] = curr_box[0];
			curr_box[9] = curr_box[1];
			curr_box[10] = curr_box[2];
			curr_box[11] = curr_box[3];

			curr_box[0] = new_x;
			curr_box[1] = new_y;

			curr_box[8] = new_x
			curr_box[9] = new_y;

			widget.box_range.begin_state = null;
			widget.box_range.during_state = null;
			return {
				action: "select"
			};
		},

		{
			mouse: "pointerup",
			action: "move",
			bound: "out"
		}, function (node, widget, event, pos) {
			widget.box_range.begin_state = null;
			widget.box_range.during_state = null;
			widget.box_range.select.length = 0;
			return {
				action: ""
			};
		}
	],

	// Box resize
	...[
		{
			mouse: "pointerdown",
			where: "br",
			action: "select",
			bound: "in"
		}, function (node, widget, event, pos) {
			if (!widget.box_range.delay_state)
				widget.box_range.delay_state = window.performance.now();
			else if (window.performance.now() - widget.box_range.delay_state < widget.box_range.delay_dbl) {
				if (event.shiftKey)
					box_range_grid_snap(pos, widget);
				widget.box_range.begin_state = pos;
				widget.box_range.during_state = pos;
				widget.box_range.delay_state = null;
				return {
					action: "resize"
				};
			}
		},

		[
			{
				mouse: "pointermove",
				action: "resize",
				bound: "in"
			},
		], function (node, widget, event, pos) {
			if (!pos) return;
			widget.box_range.during_state = pos;
			if (event.shiftKey) {
				box_range_grid_snap(widget.box_range.begin_state, widget);
				box_range_grid_snap(widget.box_range.during_state, widget);
			}
		},

		{
			mouse: "pointerup",
			action: "resize",
			bound: "in"
		}, function (node, widget, event, pos) {
			if (!lib0246.equal_array(widget.box_range.during_state, widget.box_range.begin_state, false)) {
				const curr_box = widget.box_range.select[widget.box_range.select.length - 1];

				let res = lib0246.calc_flex_norm(
					curr_box[0], curr_box[1], curr_box[2], curr_box[3],
					curr_box[4], curr_box[5], curr_box[6], curr_box[7],
					widget.flex.hold_mouse[0], widget.flex.hold_mouse[1], widget.flex.hold_mouse[2], widget.flex.hold_mouse[3],
				);
				
				res = lib0246.calc_resize(
					res[0], res[1], res[2], res[3],
					widget.box_range.during_state[0], widget.box_range.during_state[1]
				);

				curr_box[0] = res[0];
				curr_box[1] = res[1];
				curr_box[2] = res[2];
				curr_box[3] = res[3];

				curr_box[4] = widget.flex.hold_mouse[0];
				curr_box[5] = widget.flex.hold_mouse[1];
				curr_box[6] = widget.flex.hold_mouse[2];
				curr_box[7] = widget.flex.hold_mouse[3];

				curr_box[8] = curr_box[0];
				curr_box[9] = curr_box[1];
				curr_box[10] = curr_box[2];
				curr_box[11] = curr_box[3];

				// Remove index 12 to index 19
				curr_box.splice(12, 8);
			}

			widget.box_range.begin_state = null;
			widget.box_range.during_state = null;
			return {
				action: "select"
			};
		},
		
		{
			mouse: "pointerup",
			bound: "in",
			where: "br",
			action: "select"
		}, () => {},

		{
			mouse: "pointerup",
			action: "resize",
			bound: "out"
		}, function (node, widget, event, pos) {
			widget.box_range.begin_state = null;
			widget.box_range.during_state = null;
			widget.box_range.select.length = 0;
			return {
				action: ""
			};
		}
	],

	// Box z-index
	...[
		[
			{
				mouse: "pointerdown",
				where: "tl",
				action: "select",
				bound: "in"
			}, {
				mouse: "pointerdown",
				where: "bl",
				action: "select",
				bound: "in"
			}
		], function (node, widget, event, pos) {
			if (!widget.box_range.delay_state)
				widget.box_range.delay_state = window.performance.now();
			else if (window.performance.now() - widget.box_range.delay_state < widget.box_range.delay_dbl) {
				const curr_index = widget.box_range.boxes.indexOf(widget.box_range.select[widget.box_range.select.length - 1]);

				// Insert box to curr_index + 1 if state.where is bottom left, else curr_index - 1
				widget.box_range.boxes.splice(
					lib0246.rem(widget.box_range.state.where === "bl" ? curr_index + 1 : curr_index - 1, widget.box_range.boxes.length),
					0,
					widget.box_range.boxes.splice(curr_index, 1)[0]
				);

				widget.box_range.delay_state = null;

				return {
					action: "select"
				};
			}
		},

		[
			{
				mouse: "pointerup",
				where: "tl",
				action: "select",
				bound: "in"
			}, {
				mouse: "pointerup",
				where: "bl",
				action: "select",
				bound: "in"
			}
		], () => {}
	],
	
	// Box delete
	...[
		{
			mouse: "pointerdown",
			where: "tr",
			action: "select",
			bound: "in"
		}, function (node, widget, event, pos) {
			if (!widget.box_range.delay_state)
				widget.box_range.delay_state = window.performance.now();
			else if (window.performance.now() - widget.box_range.delay_state < widget.box_range.delay_dbl) {
				box_range_process_del(widget);
				return {
					action: ""
				};
			}
		},

		{
			mouse: "pointerup",
			where: "tr",
			action: "select",
			bound: "in"
		}, () => {},
	],

	// Reset state if invalid
	{}, function (node, widget, event, pos) {
		reset_state(widget.box_range.state);
		widget.box_range.select.length = 0;
		widget.box_range.begin_state = null;
		widget.box_range.during_state = null;
		widget.box_range.select_during = null;
		widget.box_range.delay_state = null;
	}
];

const NODE_COLOR_LIST = Object.keys(LGraphCanvas.node_colors);

export function BOX_RANGE_WIDGET(data_type, data_name, options = {}) {
	const widget = {
		type: data_type,
		name: data_name,
		get value() {
			let data = [];

			for (let i = 0; i < this.box_range.boxes.length; ++ i)
				data.push(lib0246.calc_flex_norm(
					this.box_range.boxes[i][0], this.box_range.boxes[i][1], this.box_range.boxes[i][2], this.box_range.boxes[i][3],
					this.box_range.boxes[i][4], this.box_range.boxes[i][5], this.box_range.boxes[i][6], this.box_range.boxes[i][7],
					this.flex.hold_draw[0], this.flex.hold_draw[1], this.flex.hold_draw[2], this.flex.hold_draw[3]
				));

			return {
				type: "box_range",
				data: data,
				area: [
					this.flex.hold_draw[0], this.flex.hold_draw[1],
					this.flex.hold_draw[2], this.flex.hold_draw[3]
				],
				flag: this.flex.ratio === 0
			};
		},
		set value(v) {
			if (v.flag)
				this.flex.ratio = 0;
			else
				this.flex.ratio = v.area[2] / v.area[3];

			this.box_range.boxes.length = 0;

			for (let i = 0; i < v.data.length; ++ i)
				this.box_range.boxes.push([
					...v.data[i],
					...v.area,
					...v.data[i],
				]);
		},
		draw: function (ctx, node, widget_width, y, widget_height) {
			ctx.save();

			ctx.beginPath();
			ctx.strokeStyle = "#000000";
			ctx.fillStyle = app.canvas.clear_background_color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.rect(this.flex.hold_draw[0], this.flex.hold_draw[1], this.flex.hold_draw[2], this.flex.hold_draw[3]);
			ctx.clip();
			ctx.stroke();
			ctx.fill();
			ctx.closePath();

			if (!this?.options?.hideOnZoom || app.canvas.ds.scale >= 0.5) {
				// Draw evenly spaced grid of both row and column of specified count
				ctx.beginPath();
				ctx.strokeStyle = "#000000";
				ctx.lineWidth = 1;
				ctx.lineWidth = 0.5;
				ctx.setLineDash([10, 5]);
				for (let i = 0; i < this.row_count; ++ i) {
					ctx.moveTo(this.flex.hold_draw[0], i * this.flex.hold_draw[3] / this.row_count + this.flex.hold_draw[1]);
					ctx.lineTo(this.flex.hold_draw[2] + this.flex.hold_draw[0], i * this.flex.hold_draw[3] / this.row_count + this.flex.hold_draw[1]);
					ctx.stroke();
				}
				for (let i = 0; i < this.col_count; ++ i) {
					ctx.moveTo(i * this.flex.hold_draw[2] / this.col_count + this.flex.hold_draw[0], this.flex.hold_draw[1]);
					ctx.lineTo(i * this.flex.hold_draw[2] / this.col_count + this.flex.hold_draw[0], this.flex.hold_draw[3] + this.flex.hold_draw[1]);
					ctx.stroke();
				}
				ctx.closePath();

				// Map each point to fit the grid by percentage based on previous size to current size
				if (this?.box_range?.boxes)
					for (let i = 0; i < this.box_range.boxes.length; ++ i) {
						let curr = this.box_range.boxes[i];
						const res = lib0246.calc_flex_norm(
							curr[0], curr[1], curr[2], curr[3],
							curr[4], curr[5], curr[6], curr[7],
							this.flex.hold_draw[0], this.flex.hold_draw[1], this.flex.hold_draw[2], this.flex.hold_draw[3]
						);
						curr[8] = res[0];
						curr[9] = res[1];
						curr[10] = res[2];
						curr[11] = res[3];
					}

				// Draw each box
				if (this?.box_range?.boxes) {
					for (let i = 0; i < this.box_range.boxes.length; ++ i) {
						let curr = this.box_range.boxes[i];

						if (this.box_range.boxes[i] === this.box_range.select[this.box_range.select.length - 1]) {
							// Draw text metadata bottom left of the entire grid
							ctx.beginPath();
							ctx.fillStyle = "#ffffff";
							ctx.font = "12px Consolas";
							ctx.fillText(
								// `%XY2: (${lib0246.floor(lib0246.norm(curr[8] + curr[10], this.flex.hold_draw[0], this.flex.hold_draw[2]), 2)}, ${lib0246.floor(lib0246.norm(curr[9] + curr[11], this.flex.hold_draw[1], this.flex.hold_draw[3]), 2)})`,
								`%WH: (${lib0246.floor(curr[10] / this.flex.hold_draw[2], 2)}, ${lib0246.floor(curr[11] / this.flex.hold_draw[3], 2)})`,
								this.flex.hold_draw[0] + 5, this.flex.hold_draw[3] + this.flex.hold_draw[1] - 5
							);
							ctx.fillText(
								`%XY: (${lib0246.floor(lib0246.norm(curr[0], this.flex.hold_draw[0], this.flex.hold_draw[2]), 2)}, ${lib0246.floor(lib0246.norm(curr[1], this.flex.hold_draw[1], this.flex.hold_draw[3]), 2)})`,
								this.flex.hold_draw[0] + 5, this.flex.hold_draw[3] + this.flex.hold_draw[1] - 20
							);
							ctx.fillText(
								`Z: ${i}`,
								this.flex.hold_draw[0] + 5, this.flex.hold_draw[3] + this.flex.hold_draw[1] - 35
							);
							ctx.fillText(
								`WH: (${lib0246.floor(curr[10], 2)}, ${lib0246.floor(curr[11], 2)})`,
								this.flex.hold_draw[0] + 5, this.flex.hold_draw[3] + this.flex.hold_draw[1] - 50
							);
							ctx.fillText(
								`XY: (${lib0246.floor(curr[8], 2)}, ${lib0246.floor(curr[9], 2)})`,
								this.flex.hold_draw[0] + 5, this.flex.hold_draw[3] + this.flex.hold_draw[1] - 65
							);
							ctx.closePath();

							// Draw 4 circles for each corner
							ctx.beginPath();
							ctx.lineWidth = 1;
							ctx.strokeStyle = "#ff7ac1";
							ctx.setLineDash([]);
							ctx.arc(curr[8], curr[9], this.box_range.radius, 0, Math.PI * 2);
							ctx.stroke();
							ctx.closePath();
							ctx.beginPath();
							ctx.strokeStyle = "#800044";
							ctx.arc(curr[8], curr[9] + curr[11], this.box_range.radius, 0, Math.PI * 2);
							ctx.stroke();
							ctx.closePath();

							// Delete
							ctx.beginPath();
							ctx.lineWidth = 1;
							ctx.strokeStyle = "#ff0000";
							ctx.arc(curr[8] + curr[10], curr[9], this.box_range.radius, 0, Math.PI * 2);
							ctx.stroke();
							ctx.closePath();

							// Resize
							ctx.beginPath();
							ctx.strokeStyle = "#ffff00";
							ctx.arc(curr[8] + curr[10], curr[9] + curr[11], this.box_range.radius, 0, Math.PI * 2);
							ctx.stroke();
							ctx.closePath();
						}

						ctx.beginPath();
						ctx.fillStyle = "rgba(127, 127, 127, 0.1)";
						if (this.box_range.select.length > 0 && this.box_range.select.indexOf(this.box_range.boxes[i]) === this.box_range.select.length - 1) {
							ctx.lineWidth = 1.5;
							ctx.strokeStyle = "#ff0000";
							ctx.setLineDash([5, 5]);
						} else {
							ctx.lineWidth = 1;
							ctx.strokeStyle = "#ffffff";
							ctx.setLineDash([]);
						}
						ctx.rect(curr[8], curr[9], curr[10], curr[11]);
						ctx.stroke();
						ctx.fill();
						ctx.closePath();
					}

					for (let i = 0; i < this.box_range.boxes.length; ++ i) {
						let curr = this.box_range.boxes[i];

						// Draw index text starting from the box top left
						ctx.beginPath();
						ctx.fillStyle = LGraphCanvas.node_colors[NODE_COLOR_LIST[i % NODE_COLOR_LIST.length]].groupcolor;
						ctx.font = "15px Consolas";
						ctx.fillText(
							`${i}`,
							curr[8] + 5, curr[9] + 15
						);
						ctx.closePath();
					}
				}

				// Draw ghost movement
				if (this?.box_range?.begin_state && this?.box_range?.during_state) {
					ctx.beginPath();
					ctx.lineWidth = 3;
					ctx.setLineDash([5, 5]);
					ctx.moveTo(this.box_range.begin_state[0], this.box_range.begin_state[1]);
					let last_select = this.box_range.select[this.box_range.select.length - 1] ?? [];

					switch (this.box_range.state.action) {
						case "create": {
							ctx.strokeStyle = "rgba(0, 255, 0, 0.75)";
							ctx.rect(
								this.box_range.begin_state[0], this.box_range.begin_state[1],
								this.box_range.during_state[0] - this.box_range.begin_state[0], this.box_range.during_state[1] - this.box_range.begin_state[1],
							);
						} break;
						case "resize": {
							ctx.strokeStyle = "rgba(255, 255, 0, 0.75)";
							const res = lib0246.calc_resize(
								last_select[8], last_select[9], last_select[10], last_select[11],
								this.box_range.during_state[0], this.box_range.during_state[1]
							);
							ctx.rect(res[0], res[1], res[2], res[3]);
						} break;
						case "move": {
							ctx.strokeStyle = "rgba(0, 0, 255, 0.75)";
							ctx.rect(
								last_select[8] + this.box_range.during_state[0] - this.box_range.begin_state[0],
								last_select[9] + this.box_range.during_state[1] - this.box_range.begin_state[1],
								last_select[10], last_select[11]
							);
						}
					}

					ctx.stroke();
					ctx.closePath();

					ctx.beginPath();
					ctx.fillStyle = "#ffffff";
					ctx.font = "12px Consolas";
					ctx.fillText(
						`!XY: (${lib0246.floor(this.box_range.during_state[0], 2)}, ${lib0246.floor(this.box_range.during_state[1], 2)})`,
						this.flex.hold_draw[0] + 5, this.flex.hold_draw[1] + 15
					);
					ctx.closePath();
				}
			}
			ctx.restore();
		},
		mouse: function (event, pos, node) {
			// if (pos[0] < this.flex.hold_mouse[0])
			// 	pos[0] = this.flex.hold_mouse[0];
			// if (pos[1] < this.flex.hold_mouse[1])
			// 	pos[1] = this.flex.hold_mouse[1];
			// if (pos[0] > this.flex.hold_mouse[2] + this.flex.hold_mouse[0])
			// 	pos[0] = this.flex.hold_mouse[2] + this.flex.hold_mouse[0];
			// if (pos[1] > this.flex.hold_mouse[3] + this.flex.hold_mouse[1])
			// 	pos[1] = this.flex.hold_mouse[3] + this.flex.hold_mouse[1];
			
			widget.box_range.state = widget.box_range.state ?? {};
			widget.box_range.delay_state = widget.box_range.delay_state ?? null;
			
			widget.box_range.state.mouse = event.type;

			let box_flag = false;
			if (widget.box_range.select.length > 0)
				if (box_range_eval_corner(pos, widget.box_range.select[widget.box_range.select.length - 1], widget))
					box_flag = true;
				else if (lib0246.is_inside_rect(
					pos[0], pos[1],
					widget.box_range.select[widget.box_range.select.length - 1][8], widget.box_range.select[widget.box_range.select.length - 1][9],
					widget.box_range.select[widget.box_range.select.length - 1][10], widget.box_range.select[widget.box_range.select.length - 1][11]
				)) {
					widget.box_range.state.where = "box";
					box_flag = true;
				}
			
			if (!box_flag)
				for (let i = 0; i < widget.box_range.boxes.length; ++ i)
					if (lib0246.is_inside_rect(
						pos[0], pos[1],
						widget.box_range.boxes[i][8], widget.box_range.boxes[i][9],
						widget.box_range.boxes[i][10], widget.box_range.boxes[i][11]
					)) {
						widget.box_range.state.where = "box";
						box_flag = true;
						break;
					} else if (box_range_eval_corner(pos, widget.box_range.boxes[i], widget)) {
						box_flag = true;
						break;
					}

			widget.box_range.state.bound = lib0246.is_inside_rect(
				pos[0], pos[1],
				this.flex.hold_mouse[0], this.flex.hold_mouse[1], this.flex.hold_mouse[2], this.flex.hold_mouse[3]
			) ? "in" : "out";

			if (!widget.box_range.state.where || !box_flag)
				widget.box_range.state.where = "";

			if (!widget.box_range.state.action)
				widget.box_range.state.action = "";

			if (window.performance.now() - (widget.box_range.delay_state ?? 0) > widget.box_range.delay_dbl)
				widget.box_range.delay_state = null;

			eval_state(BOX_RANGE_STATE, widget.box_range.state, node, widget, event, pos);
		},
	};

	widget.box_range = widget.box_range ?? {};
	widget.box_range.boxes = widget.box_range.boxes ?? [];
	widget.box_range.select = widget.box_range.select ?? [];

	widget.box_range.delay_dbl = widget.box_range.delay_dbl ?? options.delay_dbl ?? 200;
	widget.box_range.radius = widget.box_range.radius ?? options.radius ?? 15;

	widget.row_count = options.row_count ?? 20;
	widget.col_count = options.col_count ?? 20;

	return widget;
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
function cloud_group_query_group(group_curr, group_dict, group_list, group_stack) {
	const seen = new Set();
	if (!Array.isArray(group_stack))
		group_stack = [group_stack];
	while (group_stack.length > 0) {
		const temp = group_stack.pop();
		for (let ii = 0; ii < group_list.length; ++ ii)
			if (group_dict[group_list[ii]]?.group?.includes?.(temp) && !seen.has(group_list[ii])) {
				group_curr.push(group_list[ii]);
				group_stack.push(group_list[ii]);
				seen.add(group_list[ii]);
			}
	}
	return group_curr;
}
Symbol("cloud_mark");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const WIDGETS_MAP = new WeakMap(), WIDGETS_SELF = Symbol("widgets_self");

function setup_hijack_widget(node, name_fn) {
	const original_widgets = node.widgets;
	if (!original_widgets) return;

	// Store the original widgets before applying the proxy
	WIDGETS_MAP.set(node, original_widgets);

	node.widgets = new Proxy(original_widgets, {
		get(target, prop, receiver) {
			const original_widget = Reflect.get(target, prop, receiver);
			if (original_widget && typeof original_widget === 'object') {
				return new Proxy(original_widget, {
					get(widget_target, widget_prop) {
						if (widget_prop === 'name')
							return name_fn(node, widget_target);
						else if (widget_prop === WIDGETS_SELF)
							return original_widget;
						return Reflect.get(widget_target, widget_prop);
					}
				});
			}
			return original_widget;
		}
	});
}

function reset_hijack_widget(node) {
	if (WIDGETS_MAP.has(node)) {
		node.widgets = WIDGETS_MAP.get(node);
		WIDGETS_MAP.delete(node);
	}
}

export const NODE_PARENT = Symbol("node_parent");

function hijack_widget_name(node, widget) {
	if (node.comfyClass === "0246.Hub" && widget[NODE_PARENT])
		return `node:${widget[NODE_PARENT].id}:${widget.name}`;
	return widget.name;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.registerExtension({
	name: "0246.Widget",
	async init() {
		// Shamelessly imported :3
		rgthree_utils = await lib0246.try_import("../../../extensions/rgthree-comfy/utils.js");

		// await lib0246.load_script("https://unpkg.com/interactjs@1.10.23/dist/interact.min.js");
		// mtb_widgets =  await lib0246.try_import("../../../extensions/comfy_mtb/mtb_widgets.js");
		// import { JSONEditor } from "https://cdn.jsdelivr.net/npm/vanilla-jsoneditor/standalone.js";
	},
	async setup(app) {
		lib0246.hijack(app.canvas, "processNodeWidgets", function (node) {
			if (!this.mark)
				PROCESS_WIDGET_NODE = node;
			else
				PROCESS_WIDGET_NODE = null;
		});

		lib0246.hijack(app.canvas, "drawNodeWidgets", function () {
			if (!this.mark) {
				const node = arguments[0];
				if (node.comfyClass === "0246.Hub") {
					// [TODO] Temporary. Probably we wants to rebuild widget list dynamically
					// for (let i = 8; i < node.widgets.length; ++ i) {
					// 	let found = false, widget_self = node.widgets[i][WIDGETS_SELF];
					// 	if (!widget_self) continue;
					// 	for (let id in node.hub.node_widget)
					// 		if (
					// 			node.hub.node_widget[id].indexOf(widget_self) > -1 ||
					// 			node.hub.sole_widget.includes(widget_self)
					// 		) {
					// 			found = true;
					// 			break;
					// 		}
					// 	if (!found && widget_self.type !== "space_title")
					// 		node.widgets.splice(i --, 1);
					// }
					// calc_flex(node, node.size[0]);
					// console.log(node.size);
					node.hubSize();
					// app.canvas.setDirty(true);
				}
			}
		});

		lib0246.hijack(app, "graphToPrompt", async function () {
			if (!this.mark)
				for (let i = 0; i < this.self.graph._nodes.length; ++ i) {
					const node = this.self.graph._nodes[i];
					if (node.comfyClass === "0246.Hub")
						setup_hijack_widget(node, hijack_widget_name);
				}
			else
				for (let i = 0; i < this.self.graph._nodes.length; ++ i) {
					const node = this.self.graph._nodes[i];
					if (node.comfyClass === "0246.Hub")
						reset_hijack_widget(node);
				}
		});

		lib0246.hijack(app.graph, "remove", function (node) {
			if (!this.mark && node.type === "0246.Junction") {
				for (let i = node.inputs.length - 1; i >= 0; -- i)
					node.removeInput(i);
				for (let i = node.outputs.length - 1; i >= 0; -- i)
					node.removeOutput(i);
			}
		});

		app.ui.settings.addSetting({
			id: "0246.AlternateDOMWidget",
			name: "[ComfyUI-0246] Alternative DOM widget implementation",
			tooltip: lib0246.indent_str `
				Enable alternative DOM widget implementation by replacing the default DOM widget implementation.

				Disable if you're experiencing issues relating to text boxes floating/lingering and other rendering stuff.

				This setting are required to use "[0246.Cloud]" node.
			`,
			type: "boolean",
			defaultValue: true,
		});
	},
});
