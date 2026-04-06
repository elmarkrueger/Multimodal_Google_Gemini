import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "comfyui-gemini-multimodal.HideApiKey",
    nodeCreated(node) {
        if (node.comfyClass !== "Gemini_Multimodal_Node") return;

        try {
            const w = node.widgets?.find((w) => w.name === "api_key");
            if (!w) return;

            const BULLET = "\u2022";
            const mask = (v) => (v ? BULLET.repeat(v.length) : "");
            const isMasked = (v) =>
                v && v.length > 0 && [...v].every((c) => c === BULLET);

            // Store real key in closure — widget.value is always bullets on screen
            let realKey = w.value || "";
            w.value = mask(realKey);

            // Capture user edits (fires when user submits the prompt dialog)
            const origCb = w.callback;
            w.callback = function (v) {
                if (v !== undefined && !isMasked(v)) {
                    realKey = v;
                }
                w.value = mask(realKey);
                origCb?.call(this, realKey);
            };

            // ComfyUI uses serializeValue for prompt execution — return the real key
            w.serializeValue = async function () {
                return realKey;
            };

            // Workflow save: replace bullets with real key in the serialized data
            const origSerialize = node.onSerialize;
            node.onSerialize = function (o) {
                origSerialize?.call(this, o);
                if (o.widgets_values) {
                    const idx = node.widgets.indexOf(w);
                    if (idx >= 0 && idx < o.widgets_values.length) {
                        o.widgets_values[idx] = realKey;
                    }
                }
            };

            // Workflow load: capture the real key from saved data, then mask
            const origCfg = node.onConfigure;
            node.onConfigure = function (info) {
                origCfg?.call(this, info);
                const loaded = w.value;
                if (loaded && !isMasked(loaded)) {
                    realKey = loaded;
                }
                w.value = mask(realKey);
            };
        } catch (e) {
            console.warn("[Gemini] API key masking setup failed:", e);
        }
    },
});
