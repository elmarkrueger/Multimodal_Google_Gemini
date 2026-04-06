from .nodes.gemini_node import GeminiMultimodalNode

NODE_CLASS_MAPPINGS = {
    "Gemini_Multimodal_Node": GeminiMultimodalNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Gemini_Multimodal_Node": "Gemini Multimodal Node",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
