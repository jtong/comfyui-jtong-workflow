import json
import urllib.parse
import urllib.request
import uuid

import websocket  # NOTE: websocket-client (https://github.com/websocket-client/websocket-client)

# server_address = "127.0.0.1:8189"
client_id = str(uuid.uuid4())



# def get_history(prompt_id):
#     with urllib.request.urlopen("http://{}/history/{}".format(server_address, prompt_id)) as response:
#         return json.loads(response.read())


def api():
#     prompt = json.loads("""{
#   "8": {
#     "inputs": {
#       "text": [
#         "15",
#         0
#       ]
#     },
#     "class_type": "show_text_party",
#     "_meta": {
#       "title": "显示文本(show_text)"
#     }
#   },
#   "15": {
#     "inputs": {
#       "prompt": "promptssxx"
#     },
#     "class_type": "CR Prompt Text",
#     "_meta": {
#       "title": "⚙️ CR Prompt Text"
#     }
#   }
# }""")
#     prompt["15"]["inputs"]["prompt"] = "Hello Prompt"

    prompt = json.loads("""
{
  "1": {
    "inputs": {
      "_query": {
        "data": ">data;",
        "update": "lwx58zq4ci9dtn0bckh"
      },
      "+data:STRING": [
        "2",
        0
      ]
    },
    "class_type": "jtong.Highend",
    "_meta": {
      "title": "Highend"
    }
  },
  "2": {
    "inputs": {
      "prompt": "prompt"
    },
    "class_type": "CR Prompt Text",
    "_meta": {
      "title": "⚙️ CR Prompt Text"
    }
  }
}
    """)
    prompt["2"]["inputs"]["prompt"] = "Hello Prompt"

    server_address = "127.0.0.1:8178"

    ws = websocket.WebSocket()
    ws.connect("ws://{}/ws?clientId={}".format(server_address, client_id))

    p = {"prompt": prompt, "client_id": client_id}
    data1 = json.dumps(p).encode("utf-8")
    req = urllib.request.Request("http://{}/prompt".format(server_address), data=data1)
    prompt_id = json.loads(urllib.request.urlopen(req).read())["prompt_id"]



    output_text = ""
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

    # print(history)
    # print(json.dumps(history))

    # output_text = history[prompt_id]["outputs"]["8"]["text"]
    for o in history["outputs"]:
        for node_id in history["outputs"]:
            node_output = history["outputs"][node_id]
            if "response" in node_output:
                # output_text = node_output["response"][0]["content"]
                output_text = node_output["response"][0]

    return output_text




class workflow_caller:
    @classmethod
    def INPUT_TYPES(s):

        return {
            "required": {
                "is_enable": ("BOOLEAN", {"default": True}),
            },
            # "optional": {
            #     "file_content": ("STRING", {"forceInput": True}),
            #     "image_input": ("IMAGE", {}),
            #     "file_path": ("STRING", {}),
            #     "img_path": ("STRING", {}),
            #     "system_prompt": ("STRING", {}),
            #     "user_prompt": ("STRING", {}),
            #     "positive_prompt": ("STRING", {}),
            #     "negative_prompt": ("STRING", {}),
            #     "model_name": ("STRING", {}),
            #     # "workflow_path": (json_files, {}),
            # },
        }

    RETURN_TYPES = (
        "STRING",
    )
    RETURN_NAMES = (
        "text",
    )

    FUNCTION = "transfer"

    # OUTPUT_NODE = False

    CATEGORY = "jtong"

    def transfer(
        self,
        # file_content="",
        # image_input=None,
        # file_path="",
        # img_path="",
        # system_prompt="你是一个强大的智能助手",
        # user_prompt="",
        # positive_prompt="",
        # negative_prompt="",
        # model_name="",
        # workflow_path="测试画画api.json",
        is_enable=True,
    ):
        if is_enable == False:
            return (None,)
        # 获取当前Python解释器的路径
        # interpreter = sys.executable

        # 获取main.py的绝对路径
        # root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "main.py"))

        # 构建在新控制台窗口中执行main.py的命令
        # 使用'cmd /c'在新窗口中执行命令，并且'cmd /k'保持窗口打开
        # command = f'cmd /c start cmd /k "{interpreter} {root_path} --port 8189"'
        # check_port_and_execute_bat(8189, command)

        output_text = api()

        return (
            output_text,
        )
