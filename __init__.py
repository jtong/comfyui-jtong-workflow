from .example_node import Example
from .custom_nodes.highway import Highway
from .custom_nodes.highend import Highend
from .custom_nodes.high_workflow_caller import high_workflow_caller

# Set the web directory, any .js file in that directory will be loaded by the frontend as a frontend extension
WEB_DIRECTORY = "./web"

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = {
    "jtong.Highway": Highway,
    "jtong.Highend": Highend,
    "high_workflow_caller": high_workflow_caller,
    "Example": Example
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "jtong.Highway": "Highway",
    "jtong.Highend": "Highend",
    "high_workflow_caller": "工作流自定义参数中转器(high_workflow_caller)",
    "Example": "Example Node"
}

# __all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
