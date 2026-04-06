# ComfyUI Custom Node Development — Copilot Instructions

## Overview

This workspace develops **ComfyUI custom nodes**. All generated Python code must follow ComfyUI's node architecture, conventions, and best practices. Every node is a Python class registered via module-level dictionaries that ComfyUI discovers at startup.

---

## 1. Project Structure

Custom nodes live in ComfyUI's `custom_nodes/` directory. Use this layout:

```
custom_nodes/
└── my_custom_nodes/            # Package directory (or a single .py file)
    ├── __init__.py             # REQUIRED — exports NODE_CLASS_MAPPINGS & NODE_DISPLAY_NAME_MAPPINGS
    ├── nodes/                  # Node class definitions (one file per logical group)
    │   ├── __init__.py
    │   ├── image_nodes.py
    │   └── processing_nodes.py
    ├── utils/                  # Shared helpers (keep minimal)
    │   ├── __init__.py
    │   └── helpers.py
    ├── js/                     # Optional frontend extensions (web widgets)
    │   └── my_widget.js
    ├── pyproject.toml           # Package metadata and dependencies
    ├── requirements.txt         # Python dependencies
    └── README.md
```

### `__init__.py` (package root) — Mandatory Exports

```python
from .nodes.image_nodes import MyImageNode
from .nodes.processing_nodes import MyProcessingNode

NODE_CLASS_MAPPINGS = {
    "MyImageNode": MyImageNode,
    "MyProcessingNode": MyProcessingNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MyImageNode": "My Image Node",
    "MyProcessingNode": "My Processing Node",
}

# Optional: path to frontend JS directory (relative to this file)
WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
```

---

## 2. Node Class Anatomy

Every node class **must** define these members:

| Member | Type | Required | Purpose |
|---|---|---|---|
| `INPUT_TYPES` | `@classmethod` | **Yes** | Declares all inputs the node accepts |
| `RETURN_TYPES` | `tuple[str, ...]` | **Yes** | Data types of outputs |
| `FUNCTION` | `str` | **Yes** | Name of the method ComfyUI calls to execute the node |
| `CATEGORY` | `str` | **Yes** | Menu path in the UI (e.g. `"image/transform"`) |

Optional but recommended members:

| Member | Type | Purpose |
|---|---|---|
| `RETURN_NAMES` | `tuple[str, ...]` | Human-readable output slot names |
| `OUTPUT_NODE` | `bool` | `True` for terminal/side-effect nodes (save, preview). Default `False` |
| `OUTPUT_TOOLTIPS` | `tuple[str, ...]` | Tooltip text for each output |
| `DESCRIPTION` | `str` | Long description shown in the UI |
| `SEARCH_ALIASES` | `list[str]` | Alternative search terms for node discovery |
| `DEPRECATED` | `bool` | Marks node as deprecated in the UI |
| `EXPERIMENTAL` | `bool` | Marks node as experimental |
| `ESSENTIALS_CATEGORY` | `str` | Category for the essentials sidebar |

### Minimal Example

```python
class MyNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "Input image tensor."}),
                "strength": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 10.0,
                    "step": 0.01,
                    "tooltip": "Effect strength."
                }),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    OUTPUT_TOOLTIPS = ("The processed image.",)
    FUNCTION = "process"
    CATEGORY = "image/transform"
    DESCRIPTION = "Applies a custom transformation to the input image."

    def process(self, image, strength):
        # image shape: (B, H, W, C) float32 [0,1]
        result = image * strength
        return (result,)
```

---

## 3. INPUT_TYPES Specification

`INPUT_TYPES` is a **classmethod** that returns a dictionary with up to three keys:

```python
@classmethod
def INPUT_TYPES(cls):
    return {
        "required": { ... },   # Inputs that MUST be connected/set
        "optional": { ... },   # Inputs that MAY be connected/set
        "hidden": { ... },     # System-injected values (not visible in UI)
    }
```

### 3.1 Core Data Types

| Type String | Python Type | Description |
|---|---|---|
| `"IMAGE"` | `torch.Tensor` | Batched images `(B, H, W, C)` float32 in `[0, 1]` — **channels last** |
| `"MASK"` | `torch.Tensor` | Masks `(B, H, W)` or `(H, W)` float32 in `[0, 1]` |
| `"LATENT"` | `dict` | Dict with `"samples"` key → `(B, C, H, W)` tensor |
| `"MODEL"` | `ModelPatcher` | Diffusion model wrapper |
| `"CLIP"` | `CLIP` | Text encoder model |
| `"VAE"` | `VAE` | Variational autoencoder |
| `"CONDITIONING"` | `list` | List of `[tensor, dict]` conditioning pairs |
| `"CONTROL_NET"` | `ControlNet` | ControlNet model |
| `"CLIP_VISION"` | `ClipVision` | CLIP vision model |
| `"CLIP_VISION_OUTPUT"` | `dict` | Output from CLIP vision encode |
| `"STYLE_MODEL"` | `StyleModel` | Style model (IP-Adapter, etc.) |
| `"GLIGEN"` | `Gligen` | GLIGEN model |

### 3.2 Primitive Widget Types

```python
# Integer
"my_int": ("INT", {
    "default": 512,
    "min": 64,
    "max": 16384,       # Use MAX_RESOLUTION (16384) for resolution params
    "step": 8,          # Step size for slider/spinner
    "display": "number", # or "slider"
    "tooltip": "Description shown on hover.",
    "advanced": True,   # Collapse into advanced section
})

# Float
"my_float": ("FLOAT", {
    "default": 1.0,
    "min": 0.0,
    "max": 10.0,
    "step": 0.01,
    "round": 0.001,     # Rounding precision
    "tooltip": "A floating point value.",
})

# String
"my_string": ("STRING", {
    "default": "",
    "multiline": True,          # Multi-line text area
    "dynamicPrompts": True,     # Enable dynamic prompt syntax
    "tooltip": "Text input.",
})

# Boolean
"my_bool": ("BOOLEAN", {
    "default": True,
    "tooltip": "Toggle option.",
})

# Combo/Dropdown (list of fixed choices)
"my_choice": (["option_a", "option_b", "option_c"], {
    "tooltip": "Select one option.",
})

# Color picker
"my_color": ("INT", {
    "default": 0xFF0000,
    "min": 0,
    "max": 0xFFFFFF,
    "step": 1,
    "display": "color",
})
```

### 3.3 Special Input Options

```python
# Seed with control_after_generate (randomize/fixed/increment/decrement buttons)
"seed": ("INT", {
    "default": 0,
    "min": 0,
    "max": 0xffffffffffffffff,
    "control_after_generate": True,
})

# Image upload widget
"image": (sorted(files_list), {"image_upload": True})

# Dynamic combo populated from folder_paths
"ckpt_name": (folder_paths.get_filename_list("checkpoints"), )
"lora_name": (folder_paths.get_filename_list("loras"), )
"vae_name":  (folder_paths.get_filename_list("vae"), )
```

### 3.4 Hidden Inputs

```python
"hidden": {
    "prompt": "PROMPT",             # Full workflow prompt data
    "extra_pnginfo": "EXTRA_PNGINFO", # PNG metadata info
    "unique_id": "UNIQUE_ID",       # This node's unique ID in the workflow
    "dynprompt": "DYNPROMPT",       # Dynamic prompt expansion data
}
```

### 3.5 Optional Inputs

Optional inputs arrive as keyword arguments. Always provide defaults:

```python
@classmethod
def INPUT_TYPES(cls):
    return {
        "required": {
            "image": ("IMAGE",),
        },
        "optional": {
            "mask": ("MASK",),
            "vae": ("VAE",),
        }
    }

def process(self, image, mask=None, vae=None):
    if mask is not None:
        # use mask
        pass
    return (image,)
```

---

## 4. Output Specification

### 4.1 Single and Multiple Outputs

```python
# Single output
RETURN_TYPES = ("IMAGE",)
RETURN_NAMES = ("image",)

# Multiple outputs
RETURN_TYPES = ("IMAGE", "MASK")
RETURN_NAMES = ("image", "mask")

# The execution function MUST return a tuple matching RETURN_TYPES length
def process(self, ...):
    return (image_tensor, mask_tensor)
```

### 4.2 Output Nodes (Side-Effect Nodes)

Nodes that produce side effects (saving files, displaying previews) and have no meaningful output:

```python
RETURN_TYPES = ()      # Empty tuple — no data outputs
OUTPUT_NODE = True     # REQUIRED for nodes with side effects

def save(self, images, filename_prefix="ComfyUI", ...):
    # ... save logic ...
    # Return UI data for the frontend
    return {"ui": {"images": results}}
```

### 4.3 Returning UI Data

Output nodes can return data displayed by the frontend:

```python
return {"ui": {"images": [{"filename": f, "subfolder": s, "type": t}]}}
```

---

## 5. Tensor Conventions — CRITICAL

### Image Tensors

- **Shape**: `(B, H, W, C)` — batch, height, width, channels
- **Dtype**: `torch.float32` (use `comfy.model_management.intermediate_dtype()` when creating new tensors)
- **Range**: `[0.0, 1.0]`
- **Channel order**: RGB (3 channels) or RGBA (4 channels)
- **Device**: Use `comfy.model_management.intermediate_device()` for new tensors
- **Channels last** — this is the opposite of PyTorch's default `(B, C, H, W)`

```python
# Converting from PIL Image to ComfyUI tensor
import numpy as np
import torch
image = np.array(pil_image).astype(np.float32) / 255.0
tensor = torch.from_numpy(image)[None,]  # Add batch dim → (1, H, W, C)

# Converting from ComfyUI tensor to PIL Image
i = 255.0 * image_tensor[0].cpu().numpy()
pil_img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
```

### Mask Tensors

- **Shape**: `(B, H, W)` or `(H, W)` — no channel dimension
- **Range**: `[0.0, 1.0]` — 1.0 = masked area, 0.0 = unmasked
- Always unsqueeze if needed: `mask.unsqueeze(0)`

### Latent Tensors

- **Shape**: `(B, C, H, W)` — standard PyTorch order (**channels first**)
- Wrapped in a dict: `{"samples": tensor}`
- Spatial dimensions are 1/8 of pixel dimensions (for most models)

```python
# When movedim is needed for operations expecting (B, C, H, W):
samples = image.movedim(-1, 1)   # (B, H, W, C) → (B, C, H, W)
result = result.movedim(1, -1)   # (B, C, H, W) → (B, H, W, C)
```

---

## 6. Execution Function Rules

1. **The function named by `FUNCTION` is what ComfyUI calls.** Its parameters must match the `INPUT_TYPES` keys exactly.
2. **Return a tuple** the same length as `RETURN_TYPES`. Single-output: `return (result,)` — note the trailing comma.
3. **Do not modify input tensors in-place.** Always `.clone()` or `.copy()` before mutation:
   ```python
   s = samples.copy()         # for dicts
   t = tensor.clone()         # for tensors
   ```
4. **Use `self` only when the node has state** (e.g., caching, `__init__`). Stateless nodes can use `self` in the function signature but should not rely on instance state for determinism.
5. The function may use **keyword arguments** for optional inputs with defaults.

---

## 7. Lifecycle & Special Classmethods

### `IS_CHANGED(cls, **kwargs)` — Cache Control

Return a unique value (e.g., hash) when the node's cached output should be invalidated:

```python
@classmethod
def IS_CHANGED(cls, image, **kwargs):
    image_path = folder_paths.get_annotated_filepath(image)
    m = hashlib.sha256()
    with open(image_path, 'rb') as f:
        m.update(f.read())
    return m.digest().hex()
```

- Return `float("NaN")` to force re-execution every time.
- Omit this method if default caching (based on input values) is sufficient.

### `VALIDATE_INPUTS(cls, **kwargs)` — Input Validation

Return `True` if valid, or an error message string if invalid:

```python
@classmethod
def VALIDATE_INPUTS(cls, image):
    if not folder_paths.exists_annotated_filepath(image):
        return "Invalid image file: {}".format(image)
    return True
```

---

## 8. Working with ComfyUI APIs

### folder_paths — File Management

```python
import folder_paths

# Get list of available files in a model folder
folder_paths.get_filename_list("checkpoints")  # "loras", "vae", "controlnet", etc.

# Get full path for a model file (raises if not found)
path = folder_paths.get_full_path_or_raise("checkpoints", ckpt_name)

# Get output/input/temp directories
folder_paths.get_output_directory()
folder_paths.get_input_directory()
folder_paths.get_temp_directory()

# Get save path with auto-incrementing counter
full_output_folder, filename, counter, subfolder, prefix = \
    folder_paths.get_save_image_path(filename_prefix, output_dir, width, height)
```

### comfy.model_management — Device & Memory

```python
import comfy.model_management

# Preferred device/dtype for intermediate tensors
device = comfy.model_management.intermediate_device()
dtype = comfy.model_management.intermediate_dtype()

# Check if processing was interrupted (for long operations)
comfy.model_management.throw_exception_if_processing_interrupted()
```

### comfy.utils — Common Utilities

```python
import comfy.utils

# Upscale tensors (works on (B,C,H,W) tensors)
result = comfy.utils.common_upscale(samples, width, height, upscale_method, crop)
# upscale_method: "nearest-exact", "bilinear", "area", "bicubic", "bislerp", "lanczos"
# crop: "disabled", "center"

# Load safetensors/torch files
data = comfy.utils.load_torch_file(path, safe_load=True)

# Save torch files with metadata
comfy.utils.save_torch_file(data, path, metadata=metadata)

# Progress bar
pbar = comfy.utils.ProgressBar(total_steps)
pbar.update(1)
```

### node_helpers — Conditioning Helpers

```python
import node_helpers

# Set values on all conditioning entries
c = node_helpers.conditioning_set_values(conditioning, {"key": value})

# Safe PIL open
img = node_helpers.pillow(Image.open, image_path)
```

---

## 9. Common Node Patterns

### Image Processing Node

```python
class ImageTransform:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "amount": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "transform"
    CATEGORY = "image/transform"

    def transform(self, image, amount):
        # image: (B, H, W, C) float32 [0,1]
        result = torch.clamp(image * amount, 0.0, 1.0)
        return (result,)
```

### Loader Node

```python
class MyModelLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_name": (folder_paths.get_filename_list("custom_models"),),
            }
        }

    RETURN_TYPES = ("MY_MODEL",)
    FUNCTION = "load_model"
    CATEGORY = "loaders"

    def load_model(self, model_name):
        model_path = folder_paths.get_full_path_or_raise("custom_models", model_name)
        model = load_my_model(model_path)
        return (model,)
```

### Save/Output Node

```python
class MySaveNode:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "ComfyUI"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "save_images"
    CATEGORY = "image"

    def save_images(self, images, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
        full_output_folder, filename, counter, subfolder, filename_prefix = \
            folder_paths.get_save_image_path(filename_prefix, self.output_dir,
                                             images[0].shape[1], images[0].shape[0])
        results = []
        for batch_idx, image in enumerate(images):
            i = 255.0 * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))

            metadata = PngInfo()
            if prompt is not None:
                metadata.add_text("prompt", json.dumps(prompt))

            file = f"{filename}_{counter:05}_.png"
            img.save(
                os.path.join(full_output_folder, file),
                pnginfo=metadata,
                compress_level=self.compress_level,
            )
            results.append({"filename": file, "subfolder": subfolder, "type": "output"})
            counter += 1

        return {"ui": {"images": results}}
```

### Conditioning Modifier Node

```python
class MyConditioningNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "conditioning": ("CONDITIONING",),
                "strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 10.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    FUNCTION = "apply"
    CATEGORY = "conditioning"

    def apply(self, conditioning, strength):
        c = node_helpers.conditioning_set_values(conditioning, {"strength": strength})
        return (c,)
```

### Multi-Input/Output Node

```python
class SplitImageBatch:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "split_index": ("INT", {"default": 1, "min": 1, "max": 64}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("first_batch", "second_batch")
    FUNCTION = "split"
    CATEGORY = "image/batch"

    def split(self, images, split_index):
        split_index = min(split_index, images.shape[0])
        return (images[:split_index], images[split_index:])
```

---

## 10. Custom Data Types

Define custom types for domain-specific data passed between your nodes:

```python
# Use uppercase string identifiers
RETURN_TYPES = ("MY_CUSTOM_DATA",)

# In input types
"my_input": ("MY_CUSTOM_DATA",)
```

Custom types create **typed connections** — only outputs of `"MY_CUSTOM_DATA"` can connect to inputs of `"MY_CUSTOM_DATA"`. Use this to enforce pipeline correctness.

---

## 11. Frontend Extensions (JavaScript)

Place JS files in the `WEB_DIRECTORY` path. Use for custom widgets, visualization, or UI behavior:

```javascript
// js/my_widget.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "my_custom_nodes.MyWidget",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "MyNodeName") {
            // Customize node appearance or behavior
        }
    },
});
```

---

## 12. Best Practices Checklist

### Code Quality
- [ ] All `INPUT_TYPES` keys have `"tooltip"` descriptions
- [ ] `DESCRIPTION` is set on every node class
- [ ] `SEARCH_ALIASES` includes common search terms users would try
- [ ] `CATEGORY` uses hierarchical paths (e.g., `"image/transform"`, `"conditioning/controlnet"`)
- [ ] No hardcoded file paths — use `folder_paths` API exclusively

### Tensor Safety
- [ ] Never modify input tensors in-place — always `.clone()` / `.copy()`
- [ ] Images are `(B, H, W, C)` float32 `[0, 1]` — validate shape assumptions
- [ ] Latents are `(B, C, H, W)` inside `{"samples": tensor}` dicts
- [ ] Masks are `(B, H, W)` float32 `[0, 1]`
- [ ] Use `comfy.model_management.intermediate_device()` and `intermediate_dtype()` for new tensors
- [ ] Clamp output images to `[0, 1]` with `torch.clamp`

### Memory & Performance
- [ ] Load models lazily (in the execution function, not at import time)
- [ ] Cache loaded models in `self` to avoid redundant I/O
- [ ] Move tensors to CPU before numpy conversion: `tensor.cpu().numpy()`
- [ ] Call `comfy.model_management.throw_exception_if_processing_interrupted()` in long loops
- [ ] Use `comfy.utils.ProgressBar` for progress reporting in batch operations

### Error Handling
- [ ] Raise `RuntimeError` with descriptive messages for invalid states
- [ ] Use `VALIDATE_INPUTS` for file existence checks
- [ ] Handle `None` for optional inputs gracefully
- [ ] Never silently swallow exceptions

### Registration
- [ ] `NODE_CLASS_MAPPINGS` keys are **unique, stable identifiers** (changing them breaks saved workflows)
- [ ] `NODE_DISPLAY_NAME_MAPPINGS` provides user-friendly names
- [ ] Both dicts are exported from `__init__.py`
- [ ] `__all__` includes both mapping dicts

---

## 13. Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| Image shape `(B, C, H, W)` | ComfyUI images are `(B, H, W, C)` — channels **last** |
| Mutating input tensors | Always `.clone()` before modifying |
| `INPUT_TYPES` as instance method | Must be `@classmethod` |
| Returning bare value instead of tuple | Always `return (value,)` |
| Blocking the event loop | Use progress bars, check for interrupts |
| Importing heavy libs at module level | Import inside functions for optional deps |
| Hardcoded paths | Use `folder_paths.*` API |
| Missing `OUTPUT_NODE = True` on save nodes | Required for nodes with side effects and no data output |
| Using `print()` for logging | Use `logging.warning()` / `logging.info()` |
| Creating tensors on wrong device | Use `comfy.model_management.intermediate_device()` |

---

## 14. Testing Custom Nodes

1. **Syntax**: Ensure the module imports without error: `python -c "import my_nodes"`
2. **Registration**: Verify `NODE_CLASS_MAPPINGS` is populated and all classes resolve
3. **Type checking**: Confirm `INPUT_TYPES` returns well-formed dicts
4. **Tensor shapes**: Unit test execution functions with synthetic tensors of correct shape
5. **Round-trip**: Load a workflow using the node, execute, and verify outputs

```python
# Quick smoke test
import torch

node = MyNode()
test_image = torch.rand(1, 512, 512, 3)  # (B, H, W, C)
result = node.process(image=test_image, strength=0.5)
assert isinstance(result, tuple)
assert result[0].shape == test_image.shape
assert result[0].min() >= 0.0 and result[0].max() <= 1.0
```

---

## 15. Dependencies & Packaging

### requirements.txt

List only additional dependencies (ComfyUI provides torch, numpy, PIL, safetensors):

```
# Only list packages NOT already in ComfyUI
opencv-python>=4.8.0
```

### pyproject.toml

```toml
[project]
name = "comfyui-my-custom-nodes"
version = "1.0.0"
description = "My custom nodes for ComfyUI"
requires-python = ">=3.10"
dependencies = []

[tool.comfy]
web = "js"
```

---

## 16. Quick Reference — Node Class Template

```python
import torch
import folder_paths
import comfy.model_management
import comfy.utils

class NodeTemplate:
    """One-line description of what this node does."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "The input image."}),
            },
            "optional": {},
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    OUTPUT_TOOLTIPS = ("The output image.",)
    FUNCTION = "execute"
    CATEGORY = "my_nodes"
    DESCRIPTION = "Describe what this node does in detail."
    SEARCH_ALIASES = ["relevant", "search", "terms"]

    def execute(self, image):
        result = image.clone()
        # ... processing ...
        return (result,)
```

---

## 17. Key Imports Available in ComfyUI Runtime

```python
# Always available — do NOT add to requirements.txt
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence, ImageFilter
from PIL.PngImagePlugin import PngInfo
import safetensors.torch
import json
import os
import hashlib
import math
import logging

# ComfyUI internals
import folder_paths
import node_helpers
import comfy.model_management
import comfy.utils
import comfy.sd
import comfy.samplers
import comfy.sample
import comfy.controlnet
import comfy.clip_vision
import latent_preview
```
