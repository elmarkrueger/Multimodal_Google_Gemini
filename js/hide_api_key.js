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

        // Use a MutationObserver to catch any spawned input elements and mask them.
        // This avoids overriding mouse handlers which breaks node drag/selection.
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;
                    const inputs = addedNode.matches?.("input, textarea")
                        ? [addedNode]
                        : Array.from(addedNode.querySelectorAll?.("input, textarea") || []);
                    for (const el of inputs) {
                        if (el.value === apiKeyWidget.value && el.type !== "password") {
                            el.type = "password";
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },
});
