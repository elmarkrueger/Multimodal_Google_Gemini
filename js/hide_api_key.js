import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "comfyui-gemini-multimodal.HideApiKey",
    nodeCreated(node) {
        if (node.comfyClass !== "Gemini_Multimodal_Node") {
            return;
        }
        const apiKeyWidget = node.widgets?.find((w) => w.name === "api_key");
        if (apiKeyWidget && apiKeyWidget.inputEl) {
            apiKeyWidget.inputEl.type = "password";
        }
    },
});
