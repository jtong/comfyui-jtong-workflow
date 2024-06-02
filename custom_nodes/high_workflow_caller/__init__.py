import os
import json
import urllib.parse
import urllib.request
import uuid

import websocket  # NOTE: websocket-client (https://github.com/websocket-client/websocket-client)

from ...config import current_dir_path

client_id = str(uuid.uuid4())




def api(prompt):

    server_address = "127.0.0.1:8178"

    ws = websocket.WebSocket()
    ws.connect("ws://{}/ws?clientId={}".format(server_address, client_id))

    p = {"prompt": prompt, "client_id": client_id}
    data1 = json.dumps(p).encode("utf-8")
    req = urllib.request.Request("http://{}/prompt".format(server_address), data=data1)
    prompt_id = json.loads(urllib.request.urlopen(req).read())["prompt_id"]



    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message["type"] == "executing":
                data = message["data"]
                if data["node"] is None and data["prompt_id"] == prompt_id:
                    break  # Execution is done
        else:
            continue  # previews are binary data
    # history = get_history(prompt_id)[prompt_id]

    with urllib.request.urlopen("http://{}/history/{}".format(server_address, prompt_id)) as response:
        history = json.loads(response.read())[prompt_id]


    output = []

    for o in history["outputs"]:
        for node_id in history["outputs"]:
            node_output = history["outputs"][node_id]
            if "response" in node_output:
                # output_text = node_output["response"][0]["content"]
                output = node_output["response"]

    return output


# Self Code
from . import utils as lib0246

# 3rd Party
import aiohttp.web

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
            _way_in[("type", name)] = curr_input.get("type", "*")  # Sometimes this does not exist. Weird.

    res = []

    for i, curr_output in enumerate(curr_node["outputs"]):
        if curr_output.get("links") and curr_output["name"] not in lib0246.BLACKLIST:
            name = _workflow["workflow"]["extra"]["0246.__NAME__"][_id]["outputs"][str(i)]["name"][1:]
            if ("data", name) in _way_in:
                if curr_output["type"] == "*" or _way_in[("type", name)] == "*" or curr_output["type"] == _way_in[
                    ("type", name)]:
                    res.append(_way_in[("data", name)])
                else:
                    raise Exception(
                        f"Output \"{name}\" is not defined or is not of type \"{curr_output['type']}\". Expected \"{_way_in[('type', name)]}\".")

    _way_in[("kind")] = "highway"
    _way_in[("id")] = _id

    return (_way_in,) + tuple(res)

workflow_api_path = os.path.join(current_dir_path, "workflow_api")
workflow_api_signature_path = os.path.join(workflow_api_path, "signature")
# 获取apipath文件夹下的所有json文件名
workflow_json_files = [f for f in os.listdir(workflow_api_path) if f.endswith(".json")]
workflow_signature_json_files = [f for f in os.listdir(workflow_api_signature_path) if f.endswith(".json")]

def apply_mapping(workflow_prompt, params, mapping_json):
    """
    通过映射 JSON 将参数字典中的值映射到原始 JSON 的相应位置。

    参数:
        original_json (dict): 原始 JSON 数据。
        params (dict): 参数字典，其中包含要插入到原始 JSON 中的值。
        mapping_json (dict): 映射 JSON，指定参数字典中的哪个属性映射到原始 JSON 中的哪个节点的哪个属性。

    返回:
        dict: 修改后的 JSON 数据。
    """
    for param_key, mapping in mapping_json.items():
        node = mapping["node"]
        property = mapping["property"]
        if node in workflow_prompt and "inputs" in workflow_prompt[node]:
            workflow_prompt[node]["inputs"][property] = params[param_key]["data"]

    return workflow_prompt


def transform_to_prop_map(original_dict):
    """
    将具有元组键和混合附加键的字典转换成结构化的属性映射，其中每一个'data_key'对应一个包含'data'和'type'字段的字典。

    参数:
    original_dict (dict): 要转换的原始字典。

    返回:
    dict: 结构化的属性映射。
    """
    new_dict = {}

    # 遍历原始字典
    for key, value in original_dict.items():
        # 确保键是一个元组并且长度为2
        if isinstance(key, tuple) and len(key) == 2:
            field, data_key = key
            # 如果data_key在new_dict中尚未存在，为其创建一个新字典
            if data_key not in new_dict:
                new_dict[data_key] = {}
            # 在当前data_key的字典中填充'data'或'type'
            new_dict[data_key][field] = value

    return new_dict


def to_result(property_list):
    """
    将列表形式的属性映射转换回原始的字典格式，并返回一个元组，其中包括转换后的字典以及所有'data'字段的值。

    参数:
    property_list (list): 列表形式的属性映射。

    返回:
    tuple: 包含转换后的原始字典和所有'data'字段的值的元组。
    """
    original_dict = {}
    data_values = []

    # 遍历属性映射列表中的每个字典
    for item in property_list:
        # 每个字典只包含一个键值对，键是data_key，值是包含'data'和'type'的字典
        for data_key, properties in item.items():
            # 对于每个属性条目，创建包含data_key的元组键，并收集'data'字段的值
            for key in properties:
                original_dict[(key, data_key)] = properties[key]
                if key == 'data':
                    data_values.append(properties[key])

    # 将原始字典和所有'data'字段的值打包成元组返回
    return (original_dict, *data_values)

class high_workflow_caller:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "_query": ("STRING", {
                    "default": ">data; <data",
                    "multiline": False
                }),
                "workflow_path": (workflow_json_files, {}),
                "workflow_signature_filename": (workflow_signature_json_files, {}),
            },
            "optional": {
                "_way_in": ("HIGHWAY_PIPE",),
            },
            "hidden": {
                "_prompt": "PROMPT",
                "_id": "UNIQUE_ID",
                "_workflow": "EXTRA_PNGINFO"  # Unfortunately EXTRA_PNGINFO does not get exposed during IS_CHANGED
            }
        }

    # Amogus moment ඞ
    RETURN_TYPES = lib0246.ByPassTypeTuple(("HIGHWAY_PIPE",))
    RETURN_NAMES = lib0246.ByPassTypeTuple(("_way_out",))
    FUNCTION = "execute"
    CATEGORY = "0246"

    def execute(self, _id=None, _prompt=None, _workflow=None, _way_in=None, _query=None, workflow_path="test_workflow.json", workflow_signature_filename="test_workflow_signature.json", **kwargs):
        global current_dir_path
        WF_path = os.path.join(current_dir_path, "workflow_api", workflow_path)
        with open(WF_path, "r", encoding="utf-8") as f:
            prompt_text = f.read()
        workflow_prompt = json.loads(prompt_text)

        input = highway_impl(_prompt, _id, _workflow, _way_in, False, kwargs)
        # apply_mapping(prompt,  params, mapping_json)
        prop_map = transform_to_prop_map(input[0])

        global workflow_api_signature_path
        WF_signature_path = os.path.join(workflow_api_signature_path,  workflow_signature_filename)
        with open(WF_signature_path, "r", encoding="utf-8") as f:
            mapping_json_text = f.read()
        mapping_json = json.loads(mapping_json_text)

        workflow_prompt = apply_mapping(workflow_prompt, prop_map, mapping_json)
        output = api(workflow_prompt)
        result = to_result(output)

        result[0]["kind"] = "highway"
        result[0]["id"] = _id

        return result


    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        return lib0246.check_update(kwargs["_query"])


