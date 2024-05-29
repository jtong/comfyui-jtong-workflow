import { app } from "../../../scripts/app.js";
import { GroupNodeHandler } from "../../../extensions/core/groupNode.js";

import * as lib0246 from "./utils.js";
import * as wg0246 from "./widgets.js";

app.registerExtension({
	name: "0246.Node",
	async setup (app) {
		{
			const reroute_class = lib0246.clone_class(LiteGraph.registered_node_types.Reroute);

			reroute_class.prototype.onNodeCreated = function() {
				const DATA_TEMP = [];

				lib0246.hijack(this, "onConnectionsChange", function () {
					if (arguments[2])
						if (!this.mark) {
							DATA_TEMP[0] = this.self.inputs[0].type;
							DATA_TEMP[1] = this.self.outputs[0].type;
							DATA_TEMP[2] = this.self.size[0];
							DATA_TEMP[3] = app.graph.getNodeById(arguments[3]?.target_id)?.inputs?.[arguments[3]?.target_slot];
							if (DATA_TEMP[3]?.type === "*") {
								DATA_TEMP[4] = DATA_TEMP[3].type;
								DATA_TEMP[3].type = this.self.widgets[0].value;
							}
							this.self.inputs[0].type = this.self.outputs[0].type = this.self.widgets[0].value;
						} else {
							this.self.inputs[0].type = DATA_TEMP[0];
							this.self.outputs[0].type = DATA_TEMP[1];
							this.self.size[0] = DATA_TEMP[2];
							if (DATA_TEMP[3])
								DATA_TEMP[3].type = DATA_TEMP[4];
						}
				});

				const type_widget = this.addWidget("combo", "", "*", function(value, widget, node) {
					let curr_input_node = node.getInputNode(0),
						curr_output_node = node.getOutputNodes(0),
						prev_input_slot = app.graph.links?.[node.inputs[0].link]?.origin_slot,
						prev_output_slot = [];
					
					if (node.outputs[0].links)
						for (let i = 0; i < node.outputs[0].links.length; ++ i)
							prev_output_slot.push(app.graph.links[node.outputs[0].links[i]].target_slot);
					
					node.disconnectInput(0);
					node.disconnectOutput(0);

					wg0246.process_reroute(node);

					if (curr_output_node && curr_output_node.length > 0) {
						node.inputs[0].widget = curr_output_node[0].inputs[prev_output_slot[0]].widget;
						for (let i = 0; i < curr_output_node.length; ++ i)
							node.connect(0, curr_output_node[i], prev_output_slot[i]);
					} else
						node.inputs[0].widget = {};

					if (curr_input_node)
						curr_input_node.connect(prev_input_slot, node, 0);
				}, {
					values: wg0246.type_defs
				});

				type_widget.y = 3;
				let prev_size = this.computeSize();
				prev_size[0] = 100;

				this.serialize_widgets = true;

				this.setSize(prev_size);
			};

			lib0246.hijack(reroute_class.prototype, "onDrawForeground", function () {
				if (!this.mark)
					wg0246.process_reroute(this.self);
			});

			LiteGraph.registerNodeType(
				"0246.CastReroute",
				Object.assign(reroute_class, {
					title_mode: LiteGraph.NO_TITLE,
					title: "Cast Reroute",
					collapsable: false,
				})
			);

			reroute_class.category = "0246";
		}
	},
	nodeCreated(node) {
		switch (node.comfyClass) {
			case "jtong.Highway": {
				node.color = LGraphCanvas.node_colors.brown.color;
				node.bgcolor = LGraphCanvas.node_colors.brown.bgcolor;
			} break;
			case "0246.HighwayBatch": {
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.brown.color, "#660029");
				node.bgcolor = LGraphCanvas.node_colors.brown.bgcolor;
			} break;
			case "0246.Junction": {
				node.color = LGraphCanvas.node_colors.blue.color;
				node.bgcolor = LGraphCanvas.node_colors.blue.bgcolor;
			} break;
			case "0246.JunctionBatch": {
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.blue.color, "#660029");
				node.bgcolor = LGraphCanvas.node_colors.blue.bgcolor;
			} break;
			case "0246.Loop": {
				node.color = LGraphCanvas.node_colors.yellow.color;
				node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor;
			} break;
			case "0246.Count": {
				node.color = LGraphCanvas.node_colors.green.color;
				node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor;
			} break;
			case "0246.Hold": {
				node.color = "#666600";
				node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor;
			} break;
			case "0246.Beautify": {
				// Pink UwU
				node.color = "#652069";
				node.bgcolor = "#764378";
			} break;
			case "0246.RandomInt": {
				node.color = LGraphCanvas.node_colors.red.color;
				node.bgcolor = LGraphCanvas.node_colors.green.bgcolor;
			} break;
			case "0246.Stringify": {
				node.color = LGraphCanvas.node_colors.red.color;
				node.bgcolor = LGraphCanvas.node_colors.green.bgcolor;
			} break;
			case "0246.Merge": {
				node.color = "#660029";
				node.bgcolor = "#4d001f";
			} break;
			case "0246.BoxRange": {
				node.color = LGraphCanvas.node_colors.green.color;
				node.bgcolor = LGraphCanvas.node_colors.green.bgcolor;
			} break;
			case "0246.ScriptNode": {
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.color, "#660029");
				node.bgcolor = "#4d001f";
			} break;
			case "0246.ScriptRule": {
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.color, "#660029");
				node.bgcolor = LGraphCanvas.node_colors.green.bgcolor;
			} break;
			case "0246.ScriptPile": {
				node.color = "#660029";
				node.bgcolor = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.bgcolor, "#660029");
			} break;
			case "0246.Script": {
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.color, "#660029");
				node.bgcolor = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.bgcolor, "#660029");
			} break;
			case "0246.Hub": {
				node.color = "#1a1a1a";
				node.bgcolor = "#111";
			} break;
			case "0246.Cloud": {
				node.color = "#595959";
				node.bgcolor = "#676767";
			} break;
			case "0246.Switch": {
				// node.color = LGraphCanvas.node_colors.yellow.color;
				// node.bgcolor = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.bgcolor, "#660029");
				node.color = lib0246.mix_color_hue(LGraphCanvas.node_colors.green.color, "#660029");
				node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor;
			} break;
			case "0246.Meta": {
				node.color = "#652069";
				node.bgcolor = LGraphCanvas.node_colors.green.bgcolor;
			} break;
			case "0246.Tag": {
				node.color = "#652069";
				node.bgcolor = LGraphCanvas.node_colors.yellow.bgcolor;
			} break;
		}
		// use_everywhere.js messing with colors :(
		node._color = node.color;
		node._bgcolor = node.bgcolor;
	},
	async beforeRegisterNodeDef (nodeType, nodeData, app) {
		if (typeof nodeData.category === "string" && nodeData.category.startsWith("0246")) {
			switch (nodeData.name) {
				case "0246.BoxRange": {
					lib0246.hijack(nodeType.prototype, "onNodeCreated", function () {
						if (this.mark) {
							const node = this.self;
							const ratio_widget = node.widgets.find(w => w.name === "box_range_ratio"),
								box_widget = node.widgets.find(w => w.name === "box_range");


							ratio_widget.callback = function (value, widget, node, pos, event) {
								if (widget.name === "box_range_ratio") {
									box_widget.flex.ratio =	widget.value.data.ratio;
									app.canvas.setDirty(true);
								}
							};

							lib0246.hijack(node, "onWidgetChanged", function (name, value, old_value, widget) {
								if (!this.mark && name === "box_range_ratio")
									box_widget.flex.ratio = value.data.ratio;
							});

							box_widget.flex.ratio = ratio_widget.value.data.ratio;

							const regex_widget = node.widgets.find(w => w.name === "script_box_regex");
							regex_widget.options = regex_widget.options ?? {};
							regex_widget.options.multiline = true;

							node.serialize_widgets = true;
							node.setSize([node.size[0], Math.max(node.computeSize()[1], node.size[1])]);
						}
					}, function (mode) {
						if (mode === 0b100000) {
							this.self.size[0] = Math.max(this.self.size[0], 350);
							this.self.size[1] = Math.max(this.self.size[1], 350);
						}
					});
					lib0246.hijack(nodeType.prototype, "onAdded", function () {
						if (this.mark) {
							const ratio_widget = this.self.widgets.find(w => w.name === "box_range_ratio"),
								box_widget = this.self.widgets.find(w => w.name === "box_range");
							box_widget.flex.ratio =	ratio_widget.value.data.ratio;
							app.canvas.setDirty(true);
						}
					});
					wg0246.single_impl_output(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "jtong.Highway": {
					wg0246.highway_impl(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "0246.HighwayBatch": {
					wg0246.highway_impl(nodeType, nodeData, app, LiteGraph.GRID_SHAPE, LiteGraph.GRID_SHAPE);
				} break;
				case "0246.Junction": {
					wg0246.junction_impl(nodeType, nodeData, app, "_offset", LiteGraph.CIRCLE_SHAPE, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "0246.JunctionBatch": {
					// [TODO] Dynamically change shape when _mode is changed
					wg0246.junction_impl(nodeType, nodeData, app, "_offset", LiteGraph.GRID_SHAPE, LiteGraph.GRID_SHAPE);
				} break;
				case "0246.Loop": {
					wg0246.single_impl_input(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "0246.Count": {
					wg0246.setup_log(nodeType.prototype);
				} break;
				case "0246.Hold": {
					wg0246.single_impl_pin(nodeType, [
						"_data_in", LiteGraph.INPUT, LiteGraph.CIRCLE_SHAPE,
						"_data_out", LiteGraph.OUTPUT, LiteGraph.GRID_SHAPE,
						"_data_out_all", LiteGraph.OUTPUT, LiteGraph.GRID_SHAPE
					]);
					wg0246.setup_log(nodeType.prototype);
				} break;
				case "0246.RandomInt": {
					lib0246.hijack(nodeType.prototype, "onNodeCreated", function () {
						if (this.mark) {
							const self = this.self;
							self.outputs[0].shape = LiteGraph.GRID_SHAPE;

							const val_widget = self.widgets.find(w => w.name === "val");
							val_widget.options = val_widget.options ?? {};
							val_widget.options.multiline = true;

							this.self.addWidget("button", "Random Seed", null, () => {
								const seed_widget = self.widgets.find(w => w.name === "seed");
								seed_widget.value = Math.floor(Math.random() * (seed_widget.options.max - seed_widget.options.min + 1)) + seed_widget.options.min;
							}, {
								serialize: false
							});
							this.self.addWidget("button", "Random Value", null, () => {
								const val_widget = self.widgets.find(w => w.name === "val"),
									min_widget = self.widgets.find(w => w.name === "min"),
									max_widget = self.widgets.find(w => w.name === "max"),
									batch_widget = self.widgets.find(w => w.name === "batch_size");

								let res = val_widget.value.split(",");

								if (res.length > batch_widget.value)
									res.length = batch_widget.value;
								else if (res.length < batch_widget.value)
									for (let i = res.length; i < batch_widget.value; ++ i)
										res.push("0");

								for (let i = 0; i < batch_widget.value; ++ i) {
									if (res[i])
										res[i] = res[i].trim();
									if (res[i] !== "rand" && res[i] !== "add" && res[i] !== "sub")
										res[i] = String(Math.floor(Math.random() * (max_widget.value - min_widget.value + 1)) + min_widget.value);
								}

								val_widget.value = res.join(", ");
							}, {
								serialize: false
							});
							this.self.addWidget("button", "Change Mode", null, () => {
								const val_widget = self.widgets.find(w => w.name === "val"),
									batch_widget = self.widgets.find(w => w.name === "batch_size");

								let res = val_widget.value.split(",");

								if (res.length > batch_widget.value)
									res.length = batch_widget.value;
								else if (res.length < batch_widget.value)
									for (let i = res.length; i < batch_widget.value; ++ i)
										res.push("sub");
								
								for (let i = 0; i < batch_widget.value; ++ i)
									if (res[i]) {
										res[i] = res[i].trim();
										if (isNaN(res[i])) {
											if (res[i] !== "rand" && res[i] !== "add")
												res[i] = "rand";
											else if (res[i] === "rand")
												res[i] = "add";
											else
												res[i] = "sub";
										}
									}

								val_widget.value = res.join(", ");
							}, {
								serialize: false
							});
						}
					});
					wg0246.setup_log(nodeType.prototype, true);
				} break;
				case "0246.Beautify": {
					wg0246.setup_log(nodeType.prototype);
					lib0246.hijack(nodeType.prototype, "onNodeCreated", () => {}, function (mode) {
						if (mode === 0b100000)
							this.self.size[1] = Math.max(this.self.size[1], 100);
					});
					wg0246.single_impl_pin(nodeType, [
						"data", LiteGraph.INPUT, LiteGraph.GRID_SHAPE,
					]);
				} break;
				case "0246.Stringify": {
					wg0246.single_impl_input(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "0246.Merge": {
					wg0246.single_impl_input(nodeType, nodeData, app, LiteGraph.CIRCLE_SHAPE);
				} break;
				case "0246.Hub": {
					const Hub = nodeType;

					// [TODO] Force tracked node render by hijack app.canvas.computeVisibleNodes and
						// change getBounding of each nodes to be within app.canvas.visible_area

					lib0246.hijack(Hub.prototype, "onNodeCreated", function () {
						if (this.mark) {
							const node = this.self;

							const prim_widget = node.addWidget("combo", "base:prim", "INT", () => {}, {
								serialize: false,
								values: [
									"INT", "FLOAT", "STRING", "BOOLEAN",
									"__BATCH_PRIM__", "__BATCH_COMBO__", "__PIPE__"
									// "__SCRIPT_DATA_WRAP__", "__SCRIPT_DATA_EXEC__"
								]
							});
							node.addWidget("button", "Add Sole Primitive Widget", null, () => {
								node.hubPushWidgetPrim(prim_widget.value);
							}, {
								serialize: false
							});
							
							const combo_widget = node.addWidget("combo", "base:combo", ["KSampler", "required", "sampler_name"], () => {}, {
								serialize: false,
								values: wg0246.combo_defs
							});
							node.addWidget("button", "Add Sole Combo Widget", null, () => {
								node.hubPushWidgetCombo(...combo_widget.value);
							}, {
								serialize: false
							});
							
							const node_widget = node.addWidget("combo", "base:node", "KSampler", () => {}, {
								serialize: false,
								values: wg0246.node_defs
							});
							node.addWidget("button", "Add Sole Primitive Widgets from Node", null, () => {
								node.hubPushWidgetNode(node_widget.value);
							}, {
								serialize: false
							});

							const del_widget = node.addWidget("combo", "base:del", "", () => {}, {
								serialize: false,
								values: function (widget) {
									let res = [];
									for (let i = 0; i < node.hub.sole_widget.length; ++ i)
										res.push(node.hub.sole_widget[i].name);
									return res;
								}
							});
							node.addWidget("button", "Delete Sole Widget", null, () => {
								node.hubPullWidget(node.hub.sole_widget.find(w => w.name === del_widget.value));
							}, {
								serialize: false
							});

							lib0246.hijack(node, "connect", function (slot, target_node, target_slot) {
								if (!this.mark) {
									const output_data = this.self.hub.data.sole_type[this.self.outputs[slot].name];
									if (output_data[2] === "combo") {
										Hub.nodeData = Hub.nodeData ?? {};
										Hub.nodeData.output = Hub.nodeData.output ?? {};
										const curr_type = app.graph.extra["0246.HUB_DATA"][this.self.id].sole_type[this.self.outputs[slot].name];
										if (curr_type.length === 7)
											Hub.nodeData.output[slot] = wg0246.defs[output_data[3]].input[output_data[4]][output_data[5]][0];
										else if (curr_type[3] === "__BATCH_COMBO__") {
											const curr_value = this.self.widgets.find(_ => _.name === this.self.outputs[slot].name).value;
											Hub.nodeData.output[slot] = wg0246.defs[curr_value[0]].input[curr_value[1]][curr_value[2]][0];
										}
									}
								} else {
									const output_data = this.self.hub.data.sole_type[this.self.outputs[slot].name];
									if (output_data[2] === "combo")
										delete Hub.nodeData.output[slot];
								}
							});

							lib0246.hijack(node, "clone", function () {
								if (this.mark) {
									for (let i = 0; i < node.widgets.length; ++ i) {
										this.res.widgets[i] = this.res.widgets[i] ?? {};
										this.res.widgets[i].value = structuredClone(node.widgets[i].value);
									}
									lib0246.hijack(this.res, "serialize", function () {
										if (this.mark) {
											this.res.__id__ = node.id;
											// Technically we don't need to call serialize, but only need to update widget values
											node.widgets_values = node.serialize().widgets_values;
										}
									});
								}
							});
						}
					}, function (mode) {
						if (mode === 0b100000)
							this.self.size[0] = Math.max(this.self.size[0], 350);
					});

					const HUB_PASS_DATA = Symbol("pass_data");

					lib0246.hijack(Hub.prototype, "onAdded", function () {
						if (this.mark) {
							const node = this.self;

							node.hub = node.hub ?? {};

							app.graph.extra["0246.HUB_DATA"] = app.graph.extra["0246.HUB_DATA"] ?? {};
							app.graph.extra["0246.HUB_DATA"][node.id] = app.graph.extra["0246.HUB_DATA"][node.id] ?? {};
							node.hub.data = app.graph.extra["0246.HUB_DATA"][node.id];

							node.hub.data.node_list = node.hub.data.node_list ?? [];
							node.hub.data.node_img = node.hub.data.node_img ?? [];
							node.hub.data.sole_name = node.hub.data.sole_name ?? {};
							node.hub.data.sole_type = node.hub.data.sole_type ?? {};
							
							// Temp data
							node.hub.node_area = {};
							node.hub.node_widget = {};
							node.hub.space_widget = {};
							node.hub.node_func = {};

							node.hub.sole_widget = [];
							node.hub.sole_space = null;

							if (node[HUB_PASS_DATA]) {
								Object.assign(node.hub.data, structuredClone(app.graph.extra["0246.HUB_DATA"][node[HUB_PASS_DATA].__id__]));
								node[HUB_PASS_DATA].widgets_values = structuredClone(app.graph.getNodeById(node[HUB_PASS_DATA].__id__).widgets_values);
								wg0246.hub_setup_widget(node, node[HUB_PASS_DATA], node[HUB_PASS_DATA].__id__);

								delete node[HUB_PASS_DATA];
							}
						}
					});

					lib0246.hijack(Hub.prototype, "onConfigure", function (data) {
						if (this.mark) {
							const node = this.self;

							if (node.id)
								wg0246.hub_setup_widget(node, data, node.id);
							else
								node[HUB_PASS_DATA] = data;
						}
					});

					lib0246.hijack(Hub.prototype, "onRemoved", function () {
						if (!this.mark) {
							const node = this.self;
							if (node.hub.data)
								while (node.hub.data.node_list.length > 0)
									node.hubPullNode(node.hub.data.node_list[0]);
							delete app.graph.extra["0246.HUB_DATA"][node.id];
						}
					});

					lib0246.hijack(Hub.prototype, "getExtraMenuOptions", function (canvas, options) {
						if (!this.mark) {
							const node = this.self;
							options.push(
								{
									content: "[0246.Hub] Add widgets from \"graph selected nodes\"",
									callback: function() {
										for (let key in app.canvas.selected_nodes) {
											const curr_node = app.canvas.selected_nodes[key];
											if (curr_node === node || node.isVirtualNode || curr_node.type === "0246.Hub")
												continue;

											node.hubPushNode(curr_node);
										}
										app.canvas.setDirty(true);
									}
								}, {
									content: "[0246.Hub] Add sole widgets from \"graph selected nodes\"",
									callback: function() {
										for (let key in app.canvas.selected_nodes) {
											const curr_node = app.canvas.selected_nodes[key];
											if (curr_node === node || node.isVirtualNode || curr_node.type === "0246.Hub")
												continue;
											node.hubPushNode(curr_node.type);
										}
										app.canvas.setDirty(true);
									}
								}, {
									content: "[0246.Hub] Remove widgets from \"hub selected nodes\"",
									callback: function() {
										for (let node_id in node.hub.space_widget) {
											if (node.hub.space_widget[node_id].select)
												node.hubPullNode(node.hub.space_widget[node_id].value);
										}
										app.canvas.setDirty(true);
									}
								}, {
									content: "[0246.Hub] Select All",
									callback: function() {
										for (let node_id in node.hub.space_widget)
											node.hub.space_widget[node_id].select = true;
										app.canvas.setDirty(true);
									}
								}, {
									content: "[0246.Hub] Deselect All",
									callback: function() {
										for (let node_id in node.hub.space_widget)
											node.hub.space_widget[node_id].select = false;
										app.canvas.setDirty(true);
									}
								}
							);


							options.push(null);
						}
					});

					Hub.prototype.hubSize = function (extra = 0) {
						const curr_size = this.computeSize();
						curr_size[0] = Math.max(curr_size[0], LiteGraph.NODE_WIDTH, this.size[0]);
						// curr_size[1] += extra - 32;
						this.setSize(curr_size);
					};

					Hub.prototype.hubPushWidgetPrim = function (type, ...args) {
						const node = this;
						switch (type) {
							case "INT": {
								return node.hubPushWidget({
									type: "number",
									value: 0,
									options: {
										min: Number.MIN_SAFE_INTEGER,
										max: Number.MAX_SAFE_INTEGER,
										step: 10, // litegraph.js internally multiply by 0.1
										precision: 0
									},
								}, "int", "INT", ...args);
							} break;
							case "FLOAT": {
								return node.hubPushWidget({
									type: "number",
									value: 0,
									options: {
										min: -Infinity,
										max: Infinity,
										step: 1,
										precision: 5
									},
								}, "float", "FLOAT", ...args);
							} break;
							case "STRING": {
								return node.hubPushWidget({
									type: "string",
									value: "",
									options: {
										multiline: true
									}
								}, "string", "STRING", ...args);
							} break;
							case "BOOLEAN": {
								return node.hubPushWidget({
									type: "toggle",
									value: false,
									options: {}
								}, "boolean", "BOOLEAN", ...args);
							} break;
							case "__BATCH_PRIM__": {
								return this.hubPushWidgetComboRaw(wg0246.type_defs, type, wg0246.hub_combo_pin_type_func, ...args);
							} break;
							case "__BATCH_COMBO__": {
								return this.hubPushWidgetComboRaw(wg0246.combo_defs, type, wg0246.hub_combo_pin_type_func, args[0], args[1], wg0246.hub_serialize_batch_combo);
							} break;
							case "__PIPE__": {
								return this.hubPushWidgetComboRaw(wg0246.PIPE_COMBO, type, wg0246.hub_combo_pin_type_func, ...args);
							} break;
						}
					};

					Hub.prototype.hubPushWidgetCombo = function (node_name, part_name, pin_name, full_name) {
						return this.hubPushWidgetComboRaw(wg0246.defs[node_name].input[part_name][pin_name][0], "COMBO", () => {}, [node_name, part_name, pin_name], full_name);
					};

					Hub.prototype.hubPushWidgetComboRaw = function (combo_data, combo_type, func, extra_name, full_name, serialize_func) {
						const widget = this.hubPushWidget({
							type: "combo",
							value: combo_data[0],
							callback: func ?? (() => {}),
							options: {
								values: combo_data
							},
						}, "combo", combo_type, extra_name, full_name);
						if (serialize_func && serialize_func.constructor.name === "AsyncFunction")
							widget.serializeValue = serialize_func;
						window.setTimeout(() => {
							widget.callback(widget.value, app.canvas, this, null, null);
						}, 0);
						return widget;
					};

					Hub.prototype.hubPushWidgetNode = function (node_name, full_name) {
						for (let part_name in wg0246.defs[node_name].input)
							for (let pin_name in wg0246.defs[node_name].input[part_name]) {
								const curr_type = wg0246.defs[node_name].input[part_name][pin_name][0];
								if (Array.isArray(curr_type))
									this.hubPushWidgetCombo(node_name, part_name, pin_name, full_name);
								else
									this.hubPushWidgetPrim(curr_type, [node_name, part_name, pin_name], full_name);
							}
					};

					Hub.prototype.hubPushWidget = function (widget, id_type, pin_type, extra_name = [], full_name = "") {
						if (!this.hub.sole_space) {
							this.hub.sole_space = wg0246.SPACE_TITLE_WIDGET();
							this.widgets.splice(wg0246.HUB_SOLE + 1, 0, this.hub.sole_space);
						}

						this.widgets.splice(wg0246.HUB_SOLE + 2 + this.hub.sole_widget.length, 0, widget);
						this.hub.sole_widget.push(widget);

						if (full_name.length > 0) {
							widget.name = full_name;
							for (let i = 0; i < this.outputs.length; ++ i)
								if (this.outputs[i].name === full_name) {
									widget[wg0246.HUB_WIDGET_PIN] = this.outputs[i];
									break;
								}
						} else {
							this.hub.data.sole_name[id_type] = this.hub.data.sole_name[id_type] ?? 0;

							let list_name = [
								"sole", String(this.hub.data.sole_name[id_type] ++),
								id_type, ...extra_name, pin_type
							];

							full_name = list_name.reduce((a, b) =>
								typeof a !== "string" ? (b ?? "") :
								typeof b !== "string" ? (a ?? "") :
								a + ":" + b
							);
							
							const old_w = this.size[0];
							widget[wg0246.HUB_WIDGET_PIN] = this.addOutput(widget.name = full_name, pin_type === "__BATCH_COMBO__" ? "COMBO" : pin_type);
							this.size[0] = old_w;
							this.hub.data.sole_type[full_name] = list_name;
						}

						this.hubSize();

						return widget;
					};

					Hub.prototype.hubPullWidget = function (widget) {
						const widget_index = this.widgets.indexOf(widget);
						if (widget_index === -1)
							return;
						this.widgets.splice(widget_index, 1);
						
						delete this.hub.data.sole_type[widget.name];

						const output_index = this.outputs.indexOf(this.outputs.find(o => o.name === widget.name));
						if (output_index > -1) {
							delete Hub.nodeData.output[output_index];
							this.removeOutput(output_index);
						}

						const sole_widget_index = this.hub.sole_widget.indexOf(widget);
						if (sole_widget_index > -1)
							this.hub.sole_widget.splice(sole_widget_index, 1);

						if (this.hub.sole_widget.length === 0) {
							this.widgets.splice(wg0246.HUB_SOLE + 1, 1);
							this.hub.sole_space = null;
						}

						this.hubSize();
					};

					const HUB_PARENT = Symbol("hub_parent");

					Hub.prototype.hubPushNode = function (curr_node, flag = false) {
						const node = this;

						if (curr_node[HUB_PARENT] === node || !curr_node.widgets || curr_node.widgets.length === 0)
							return;

						curr_node[HUB_PARENT] = node;

						if (!flag || (flag && node.hub.data.node_list.indexOf(curr_node.id) === -1))
							node.hub.data.node_list.push(curr_node.id);

						node.hub.node_func[curr_node.id] = {};

						node.hub.node_func[curr_node.id].bound = lib0246.hijack(curr_node, "onBounding", function (area) {
							if (this.mark)
								node.hub.node_area[curr_node.id] = area;
						});

						node.hub.node_func[curr_node.id].remove = lib0246.hijack(curr_node, "onRemoved", function () {
							if (!this.mark)
								node.hubPullNode(curr_node.id);
						});

						node.hub.node_widget[curr_node.id] = curr_node.widgets;

						node.hub.space_widget[curr_node.id] = node.addCustomWidget(wg0246.SPACE_TITLE_WIDGET());
						node.hub.space_widget[curr_node.id].value = curr_node.id;

						node.hub.node_func[curr_node.id].draw_bg = lib0246.hijack(curr_node, "onDrawBackground", function (ctx, visible_area) {
							if (this.mark) {
								const curr_widget = node.hub.space_widget[curr_node.id];
								if (node.hub.space_widget[curr_node.id].select) {
									ctx.beginPath();
									ctx.strokeStyle = curr_widget.select_color;
									ctx.lineWidth = 2;
									ctx.setLineDash([]);
									ctx.roundRect(
										-12, -12 - LiteGraph.NODE_TITLE_HEIGHT,
										this.self.size[0] + 24, this.self.size[1] + 24 + LiteGraph.NODE_TITLE_HEIGHT,
										5, 5
									);
									ctx.stroke();
									ctx.closePath();
								}
							}
						});

						for (let i = 0; i < curr_node.widgets.length; ++ i) {
							const widget = curr_node.widgets[i];
							node.addCustomWidget(widget);
							widget[wg0246.NODE_PARENT] = curr_node;
						}

						if (curr_node.imgs && curr_node.imgs.length > 0)
							node.hub.data.node_img.push(curr_node.id);

						node.hubSize();
					};

					Hub.prototype.hubPullNode = function (curr_id) {
						const node_index = this.hub.data.node_list.indexOf(curr_id);
						if (node_index === -1)
							return;
						this.hub.data.node_list.splice(node_index, 1);
						const node_img_index = this.hub.data.node_img.indexOf(curr_id);
						if (node_img_index > -1)
							this.hub.data.node_img.splice(node_img_index, 1);

						delete this.hub.node_area[curr_id];
						if (this.hub.node_widget[curr_id]) {
							for (let widget of this.hub.node_widget[curr_id]) {
								let widget_index = this.widgets.indexOf(widget);
								if (widget_index > -1)
									this.widgets.splice(widget_index, 1);
							}
							delete this.hub.node_widget[curr_id];
						}
						// [TODO] For some reason there's trailing space_widget
						const space_widget_index = this.widgets.indexOf(this.hub.space_widget[curr_id]);
						if (space_widget_index > -1)
							this.widgets.splice(space_widget_index, 1);
						delete this.hub.space_widget[curr_id];

						const curr_node = app.graph.getNodeById(curr_id);
						if (curr_node && this.hub.node_func[curr_id]) {
							delete curr_node[HUB_PARENT];
							curr_node.onBounding = this.hub.node_func[curr_id].bound;
							curr_node.onRemoved = this.hub.node_func[curr_id].remove;
							curr_node.onDrawBackground = this.hub.node_func[curr_id].draw_bg;
						}
						delete this.hub.node_func[curr_id];

						this.hubSize();
					};

					let temp_parent = [];

					lib0246.hijack(GroupNodeHandler, "fromNodes", function (nodes) {
						if (!this.mark) {
							for (let i = 0; i < nodes.length; ++ i) {
								if (nodes[i][HUB_PARENT] && temp_parent.indexOf(nodes[i].id) === -1) {
									temp_parent.push(nodes[i][HUB_PARENT].id);
									nodes[i][HUB_PARENT].hubPullNode(nodes[i].id);
								}
								nodes[i][wg0246.SOFT_REMOVE] = true;
							}
						} else {
							if (this.res) {
								const node_list = this.res.getInnerNodes();

								let count = 0;

								while (temp_parent.length > 0) {
									const curr_parent = app.graph.getNodeById(temp_parent.pop());
									curr_parent.hubPushNode(this.res);
									const curr_count = count ++;
									node_list[curr_count][HUB_PARENT] = curr_parent;
									node_list[curr_count][wg0246.SOFT_REMOVE] = false;
								}

								lib0246.hijack(this.res, "convertToNodes", function () {
									if (!this.mark) {
										for (let i = 0; i < node_list.length; ++ i)
											if (node_list[i][HUB_PARENT]) {
												node_list[i][HUB_PARENT].hubPullNode(node_list[i].id);
												temp_parent.push(node_list[i][HUB_PARENT].id, node_list[i].id);
											}
									} else while (temp_parent.length > 0) {
										const curr_node = app.graph.getNodeById(temp_parent.pop()),
											curr_parent = app.graph.getNodeById(temp_parent.pop());

										for (let i = 0; i < this.res.length; ++ i)
											if (this.res[i].id === curr_node.id) {
												curr_parent.hubPushNode(this.res[i]);
												break;
											}
									}
								});
							}
						}
					});

					// wg0246.rgthree_exec("addConnectionLayoutSupport", Hub, app);
				} break;
				case "0246.Script": {
					wg0246.junction_impl(nodeType, nodeData, app, null, LiteGraph.GRID_SHAPE, LiteGraph.GRID_SHAPE);
				} break;
				case "0246.ScriptPile": {
					lib0246.hijack(nodeType.prototype, "onNodeCreated", function () {
						if (this.mark) {
							const regex_widget = this.self.widgets.find(w => w.name === "script_rule_regex");
							regex_widget.options = regex_widget.options ?? {};
							regex_widget.options.multiline = true;
						}
					});
				} break;
				case "0246.ScriptNode": {
					lib0246.hijack(nodeType.prototype, "onNodeCreated", function () {
						if (this.mark) {
							const regex_widget = this.self.widgets.find(w => w.name === "script_ignore_regex");
							regex_widget.options = regex_widget.options ?? {};
							regex_widget.options.multiline = true;
						}
					});
				} break;
				case "0246.Cloud": {
					const Cloud = nodeType;

					lib0246.hijack(Cloud.prototype, "onNodeCreated", function () {}, function (mode) {
						if (mode === 0b100000)
							this.self.size[0] = Math.max(this.self.size[0], 350);
					});

					lib0246.hijack(nodeType.prototype, "getExtraMenuOptions", function (canvas, options) {
						if (!this.mark) {
							this.self.constructor.nodeData[wg0246.CLOUD_MARK].self = this.self;
							wg0246.cloud_menu("cloud", options);
						} else
							this.self.constructor.nodeData[wg0246.CLOUD_MARK].self = null;
					});

					wg0246.single_impl_input(Cloud, nodeData, app, LiteGraph.CIRCLE_SHAPE);
					lib0246.hijack(Cloud.prototype, "onConnectExpand", wg0246.cloud_expand_func);
				} break;
				case "0246.Switch": {
					wg0246.junction_impl(nodeType, nodeData, app, null, LiteGraph.GRID_SHAPE, LiteGraph.GRID_SHAPE);
					lib0246.hijack(
						nodeType.prototype, "onConnectionsChange",
						function (type, index, connected, link_info) {
							const node = this.self;
							if (this.mark && !connected) {
								if (type === LiteGraph.OUTPUT && node.outputs[link_info.origin_slot].name !== "..." && node.widgets && node.outputs[link_info.origin_slot].links.length === 0) {
									node.widgets.splice(node.widgets.length - 1, 1);
									for (let i = 0; i < node.inputs.length; ++ i)
										if (node.inputs[i].name.startsWith("switch:") && i >= node.widgets.length) {
											node.inputs.splice(i --, 1);
											break;
										}
								}
								// [TODO] Maybe avoid setTimeout
								window.setTimeout(() => {
									for (let i = 0; i < node.widgets.length; ++ i)
										if (node.inputs.findIndex(_ => _.name === node.widgets[i].value) === -1)
											node.widgets[i].value = "_";
								}, 0);
							}
						},
					);
					nodeType.prototype.onNameExpand = function (type, kind, ...args) {
						const index = type ? args[1] : args[0];
						if (kind === LiteGraph.OUTPUT)
							return `${this.inputs?.find?.(_ => _.name === this.widgets?.[index]?.value)?.type ?? "_"}:${index}`;
					};
					lib0246.hijack(nodeType.prototype, "onConfigure", function (data) {
						if (this.mark) {
							const node = this.self;
							for (let i = 0; i < node.outputs.length; ++ i)
								if (node.outputs[i].name !== "...")
									wg0246.switch_widget(node, i, data.widgets_values[i]);
						}
					});
					lib0246.hijack(nodeType.prototype, "onConnectOutput", function (
						this_slot_index,
						other_slot_type,
						other_slot_obj,
						other_node,
						other_slot_index
					) {
						const node = this.self;
						if (!this.mark && node.outputs[this_slot_index].name === "..." && !other_node.inputs[other_slot_index].link)
							wg0246.switch_widget(node, this_slot_index, "_");
					});
					lib0246.hijack(nodeType.prototype, "onConnectExpand", function (mode, name) {
						if (this.mark && this.res !== true)
							this.res = name.startsWith("switch:");
					});
				} break;
				case "0246.Meta": {
					wg0246.single_impl_pin(nodeType, [
						"data", LiteGraph.INPUT, LiteGraph.GRID_SHAPE,
					]);
				} break;
			}
		}
	},
});

// [TODO] New node that integrate with rgthree to immediate execute a sole node