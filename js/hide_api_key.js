import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "comfyui-gemini-multimodal.HideApiKey",
    nodeCreated(node) {
        if (node.comfyClass !== "Gemini_Multimodal_Node") {
            return;
        }
        const apiKeyWidget = node.widgets?.find((w) => w.name === "api_key");
        if (!apiKeyWidget) return;

        // Override canvas draw to render masked text (bullet characters)
        const originalDraw = apiKeyWidget.draw;
        apiKeyWidget.draw = function (ctx, node, widgetWidth, y, widgetHeight) {
            const realValue = this.value;
            if (realValue) {
                this.value = "\u2022".repeat(realValue.length);
            }
            const result = originalDraw.call(this, ctx, node, widgetWidth, y, widgetHeight);
            this.value = realValue;
            return result;
        };

        // When the user clicks to edit, the widget creates a temporary input element.
        // Use a MutationObserver on the widget's inputEl (if it appears) or
        // override the mouse handler to catch it.
        const originalMouseDown = apiKeyWidget.mouse;
        apiKeyWidget.mouse = function (event, pos, node) {
            const result = originalMouseDown?.call(this, event, pos, node);
            // After click, ComfyUI may create a prompt dialog or inline input.
            // Schedule a check to find and mask any spawned input element.
            setTimeout(() => {
                const inputs = document.querySelectorAll(
                    'input[type="text"], textarea'
                );
                inputs.forEach((el) => {
                    if (el.value === apiKeyWidget.value) {
                        el.type = "password";
                    }
                });
            }, 50);
            return result;
        };
    },
});
