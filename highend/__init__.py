

# Self Code
from . import utils as lib0246

# 3rd Party
import aiohttp.web

# ComfyUI
import server
import json


#####################################################################################
######################################## API ########################################
#####################################################################################

@server.PromptServer.instance.routes.post('/0246-parse-highend')
async def parse_highend_handler(request):
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

class Highend:
    def __init__(self):
        self.type = "output"
        self.prefix_append = ""
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "_query": ("STRING", {
                    "default": ">data;",
                    "multiline": False
                }),
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
    RETURN_TYPES = ()
    # RETURN_NAMES = lib0246.ByPassTypeTuple(("_way_out",))
    FUNCTION = "execute"
    CATEGORY = "0246"

    OUTPUT_NODE = True

    def execute(self, _id=None, _prompt=None, _workflow=None, _way_in=None, _query=None, **kwargs):
        # all_results = {}

        # 文件命名
        # if text is not None:
        #     # 对保存的文件命名，和图片同名
        #     file = f"{filename_prefix}_.txt"
        #     # 保存文本
        #     with open(os.path.join(self.output_dir, file), "w", encoding="utf-8") as f:
        #         f.write(text)
        #     text_results.append({"content": text})
        #     # 给 all_results添加response元素
        #     all_results["response"] = text_results
        # return {"ui": all_results}

        response_list = []

        # Iterate over the kwargs to find keys that start with '+'
        for key, value in kwargs.items():
            if key.startswith('+'):
                # Extract the key and type from the kwargs key
                parts = key[1:].split(':')
                if len(parts) == 2:
                    data_key, data_type = parts
                    # Append the formatted data to the response list
                    response_list.append({data_key: {"data": value, "type": data_type}})

        # Return the structured response
        return {"ui": {"response": response_list}}
    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        return lib0246.check_update(kwargs["_query"])
