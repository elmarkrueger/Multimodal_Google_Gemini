import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "comfyui-gemini-multimodal.HideApiKey",
    nodeCreated(node) {
        if (node.comfyClass !== "Gemini_Multimodal_Node") {
            return;
        }

        try {
            const w = node.widgets?.find((w) => w.name === "api_key");
            if (!w) return;

            // Swap value to bullets BEFORE widgets are drawn (onDrawBackground runs first),
            // then restore the real value AFTER widgets are drawn (onDrawForeground runs last).
            // This avoids overriding widget.draw or widget.mouse which can break interaction.
            const origBg = node.onDrawBackground;
            const origFg = node.onDrawForeground;

            node.onDrawBackground = function (ctx) {
                origBg?.call(this, ctx);
                if (w.value) {
                    w._real = w.value;
                    w.value = "\u2022".repeat(w.value.length);
                }
            };

            node.onDrawForeground = function (ctx) {
                if (w._real !== undefined) {
                    w.value = w._real;
                    delete w._real;
                }
                origFg?.call(this, ctx);
            };
        } catch (e) {
            console.warn("[Gemini] Failed to set up API key masking:", e);
        }
    },
});
