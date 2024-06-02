from .example_node import Example
from .highway import Highway
from .highend import Highend
from .workflow_caller import workflow_caller

# Set the web directory, any .js file in that directory will be loaded by the frontend as a frontend extension
WEB_DIRECTORY = "./web"

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = {
    "jtong.Highway": Highway,
    "jtong.Highend": Highend,
    # "workflow_transfer": workflow_transfer,
    "workflow_caller": workflow_caller,
    "Example": Example
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "jtong.Highway": "Highway",
    "jtong.Highend": "Highend",
    # "workflow_transfer": "工作流中转器(workflow_transfer)",
    "workflow_caller": "工作流中转器(workflow_caller)",
    "Example": "Example Node"
}

# __all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
