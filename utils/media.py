import logging
import tempfile

import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a ComfyUI image tensor (B, H, W, C) float32 [0,1] to a PIL Image.

    Takes the first item from the batch dimension.
    """
    arr = (255.0 * tensor[0].cpu().numpy()).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def audio_dict_to_wav(audio_dict: dict) -> str:
    """Convert a ComfyUI audio dictionary to a temporary .wav file.

    Args:
        audio_dict: Dict with "waveform" (Tensor) and "sample_rate" (int) keys.

    Returns:
        Path to the temporary .wav file. Caller is responsible for deletion.
    """
    import torchaudio

    waveform = audio_dict["waveform"]
    sample_rate = audio_dict["sample_rate"]

    # ComfyUI audio waveform may have a batch dim (B, C, samples) — take first
    if waveform.dim() == 3:
        waveform = waveform[0]

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    torchaudio.save(tmp.name, waveform.cpu(), sample_rate)
    logger.info("Audio written to temp file: %s", tmp.name)
    return tmp.name


def frame_batch_to_mp4(image_tensor: torch.Tensor, fps: int = 24) -> str:
    """Convert a ComfyUI frame batch tensor (B, H, W, C) to a temporary .mp4 file.

    Args:
        image_tensor: Batched image tensor where B represents video frames.
        fps: Frames per second for the output video.

    Returns:
        Path to the temporary .mp4 file. Caller is responsible for deletion.
    """
    import comfy.model_management
    import imageio.v3 as iio

    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    tmp.close()

    num_frames = image_tensor.shape[0]
    frames = []
    for i in range(num_frames):
        comfy.model_management.throw_exception_if_processing_interrupted()
        frame = (255.0 * image_tensor[i].cpu().numpy()).clip(0, 255).astype(np.uint8)
        frames.append(frame)

    frames_array = np.stack(frames)
    iio.imwrite(tmp.name, frames_array, fps=fps, codec="libx264")
    logger.info("Video written to temp file: %s (%d frames @ %d fps)", tmp.name, num_frames, fps)
    return tmp.name
