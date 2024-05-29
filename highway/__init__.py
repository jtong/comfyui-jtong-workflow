"""
@author: Trung0246
@title: ComfyUI-0246
@nickname: ComfyUI-0246
@description: Random nodes for ComfyUI I made to solve my struggle with ComfyUI (ex: pipe, process). Have varying quality.
"""

# Built-in


# Self Code
from . import utils as lib0246

# 3rd Party
import aiohttp.web

# ComfyUI
import server

######################################################################################
######################################## IMPL ########################################
######################################################################################


def highway_impl(_prompt, _id, _workflow, _way_in, flag, kwargs):
	if isinstance(_prompt, list):
		_prompt = _prompt[0]
	if isinstance(_id, list):
		_id = _id[0]
	if isinstance(_workflow, list):
		_workflow = _workflow[0]

	if isinstance(_way_in, list):
		_way_in = _way_in[0]

	if _way_in is None:
		_way_in = lib0246.RevisionDict()
	else:
		_way_in = lib0246.RevisionDict(_way_in)

	# _way_in._id = _id
	# _way_in.purge(_way_in.find(lambda item: item.id == _id))

	# Time to let the magic play out
		
	curr_node = next(_ for _ in _workflow["workflow"]["nodes"] if str(_["id"]) == _id)

	for i, curr_input in enumerate(curr_node["inputs"]):
		if curr_input["name"] in kwargs:
			name = _workflow["workflow"]["extra"]["0246.__NAME__"][_id]["inputs"][str(i)]["name"][1:]
			if flag:
				_way_in[("data", name)] = lib0246.RevisionBatch(*kwargs[curr_input["name"]])
			else:
				_way_in[("data", name)] = kwargs[curr_input["name"]]
			_way_in[("type", name)] = curr_input.get("type", "*") # Sometimes this does not exist. Weird.

	res = []

	for i, curr_output in enumerate(curr_node["outputs"]):
		if curr_output.get("links") and curr_output["name"] not in lib0246.BLACKLIST:
			name = _workflow["workflow"]["extra"]["0246.__NAME__"][_id]["outputs"][str(i)]["name"][1:]
			if ("data", name) in _way_in:
				if curr_output["type"] == "*" or _way_in[("type", name)] == "*" or curr_output["type"] == _way_in[("type", name)]:
					res.append(_way_in[("data", name)])
				else:
					raise Exception(f"Output \"{name}\" is not defined or is not of type \"{curr_output['type']}\". Expected \"{_way_in[('type', name)]}\".")

	_way_in[("kind")] = "highway"
	_way_in[("id")] = _id

	return (_way_in, ) + tuple(res)


########################################################################################
######################################## HIJACK ########################################
########################################################################################

#####################################################################################
######################################## API ########################################
#####################################################################################

@server.PromptServer.instance.routes.post('/0246-parse-highway')
async def parse_highway_handler(request):
	data = await request.json()

	# Validate json
	if data.get("input") is None:
		return aiohttp.web.json_response({
			"error": ["No input provided"]
		})

	# Parse the input string
	expr_res, order, errors = lib0246.parse_query(data["input"], lib0246.HIGHWAY_OPS)

	lib0246.highway_check(expr_res, errors)

	# Return a JSON response with the processed data
	return aiohttp.web.json_response({
		"expr": expr_res,
		"order": order,
		"error": errors
	})

######################################################################################
######################################## NODE ########################################
######################################################################################

class Highway:
	@classmethod
	def INPUT_TYPES(cls):
		return {
			"required": {
				"_query": ("STRING", {
					"default": ">data; <data",
					"multiline": False
				}),
			},
			"optional": {
				"_way_in": ("HIGHWAY_PIPE", ),
			},
			"hidden": {
				"_prompt": "PROMPT",
				"_id": "UNIQUE_ID",
				"_workflow": "EXTRA_PNGINFO" # Unfortunately EXTRA_PNGINFO does not get exposed during IS_CHANGED
			}
		}

	# Amogus moment ඞ
	RETURN_TYPES = lib0246.ByPassTypeTuple(("HIGHWAY_PIPE", ))
	RETURN_NAMES = lib0246.ByPassTypeTuple(("_way_out", ))
	FUNCTION = "execute"
	CATEGORY = "0246"

	# [TODO] Potential recursion error when attempting to hook the inout in not a very specific way
		# => May have to keep a unique identifier for each class and each node instance
			# Therefore if already exist then throw error
				# => Cyclic detection in JS instead of python

	# Do not remove the "useless" _query parameter, since data need to be consumed for expanding
	def execute(self, _id = None, _prompt = None, _workflow = None, _way_in = None, _query = None, **kwargs):
		return highway_impl(_prompt, _id, _workflow, _way_in, False, kwargs)
	
	@classmethod
	def IS_CHANGED(cls, *args, **kwargs):
		return lib0246.check_update(kwargs["_query"])

########################################################################################
######################################## EXPORT ########################################
########################################################################################


# print("\033[95m" + lib0246.HEAD_LOG + "Loaded all nodes and apis." + "\033[0m")