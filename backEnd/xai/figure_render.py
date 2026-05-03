"""
Figure rendering helpers: numpy/matplotlib images → base64 PNG strings
for embedding directly in JSON responses.

Week 2 implementation — stub placeholder.
"""

import base64
import io
from typing import Optional
import numpy as np


def numpy_bgr_to_b64_png(bgr_array: np.ndarray) -> str:
    """Convert a BGR numpy array (H, W, 3) to a base64-encoded PNG string."""
    import cv2
    ok, buf = cv2.imencode(".png", bgr_array)
    if not ok:
        raise ValueError("cv2.imencode failed")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def matplotlib_fig_to_b64_png(fig) -> str:
    """Convert a matplotlib Figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


# TODO (Week 2): add gradcam_overlay_to_b64() which applies JET colormap
# overlay on top of the original face crop.
