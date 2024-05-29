import { app } from "../../../scripts/app.js";

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

		}
		// use_everywhere.js messing with colors :(
		node._color = node.color;
		node._bgcolor = node.bgcolor;
	},
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

