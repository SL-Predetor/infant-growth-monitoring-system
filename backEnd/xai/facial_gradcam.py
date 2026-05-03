"""
Grad-CAM for the VGG-Face ASD model.

Ported from GradCAM_ASD class in:
  mlModels/autisumDetect/sector1/Stage_4/stage4_final_model_evaluation.ipynb §5

Target layer: conv2d_14 (last conv layer in VGG-Face backbone before Global Average Pool)
VGG-Face preprocessing: 224x224, RGB→BGR swap, subtract [93.5940, 104.7624, 129.1863], NO /255.
"""

import numpy as np
import cv2
import tensorflow as tf


VGG_MEAN = [93.5940, 104.7624, 129.1863]


class GradCAM_ASD:
    """Grad-CAM implementation for nested VGG-Face model.
    Ported verbatim from stage4_final_model_evaluation.ipynb §5.
    Change from notebook: accepts numpy RGB array instead of file path.
    """

    def __init__(self, model, target_conv_layer="conv2d_14"):
        self.model = model
        self.mean  = VGG_MEAN

        # Find the nested backbone (first sub-model with its own layers)
        self.backbone = None
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model):
                self.backbone = layer
                break
        if self.backbone is None:
            raise ValueError("Could not find backbone sub-model.")

        self.conv_layer = self.backbone.get_layer(target_conv_layer)

        # Gradient model: backbone input → (conv_output, backbone_output)
        self.grad_model = tf.keras.Model(
            inputs=self.backbone.input,
            outputs=[self.conv_layer.output, self.backbone.output],
        )

    def preprocess(self, rgb_array: np.ndarray):
        """
        Preprocess a numpy RGB array for VGG-Face inference.
        Also returns the 224×224 RGB array for display.
        Matches the notebook: RGB → BGR swap, subtract VGG_MEAN, no /255.
        """
        img_rgb = cv2.resize(rgb_array, (224, 224))
        img_float = img_rgb[..., ::-1].astype(np.float32) - self.mean
        return np.expand_dims(img_float, 0), img_rgb

    def generate_heatmap(self, img_tensor):
        img_tensor = tf.cast(img_tensor, tf.float32)

        with tf.GradientTape() as tape:
            tape.watch(img_tensor)
            conv_outputs, backbone_feat = self.grad_model(img_tensor)

            # Reconstruct the classification head (mirrors notebook exactly)
            x = self.model.get_layer("gap")(backbone_feat)
            x = self.model.get_layer("asd_feature_vector_512")(x)
            x = self.model.get_layer("bn_512")(x)
            x = self.model.get_layer("asd_feature_vector_256")(x)
            pred = self.model.get_layer("classification_output")(x)
            loss = pred[:, 0]

        grads = tape.gradient(loss, conv_outputs)
        if grads is None:
            return np.zeros((7, 7))

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        heatmap = conv_outputs[0] @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0)
        max_val = tf.math.reduce_max(heatmap)
        if max_val > 0:
            heatmap = heatmap / max_val
        return heatmap.numpy()

    def explain(self, rgb_array: np.ndarray):
        """
        Run Grad-CAM on a numpy RGB array.
        Returns (img_display_rgb, superimposed_rgb, prob, label).
        """
        img_tensor, img_display = self.preprocess(rgb_array)

        prob   = float(self.model.predict(img_tensor, verbose=0).flatten()[0])
        heatmap = self.generate_heatmap(img_tensor)

        heatmap_np  = np.array(heatmap, dtype=np.float32)
        heatmap_res = cv2.resize(heatmap_np, (224, 224))
        heatmap_col = cv2.applyColorMap(np.uint8(255 * heatmap_res), cv2.COLORMAP_JET)
        heatmap_col = cv2.cvtColor(heatmap_col, cv2.COLOR_BGR2RGB)
        superimposed = cv2.addWeighted(img_display, 0.6, heatmap_col, 0.4, 0)

        return img_display, superimposed, prob


def gradcam_overlay(
    rgb_array: np.ndarray,
    vgg_model,
    target_layer: str = "conv2d_14",
) -> np.ndarray:
    """
    Run Grad-CAM on a numpy RGB face crop and return a BGR overlay image.

    Args:
        rgb_array: face crop as numpy RGB array (any size; resized to 224×224 internally)
        vgg_model: loaded Keras VGG-Face model
        target_layer: name of the target conv layer (default: conv2d_14)

    Returns:
        BGR numpy array (224×224×3) with JET colormap overlay
    """
    cam = GradCAM_ASD(vgg_model, target_conv_layer=target_layer)
    img_display_rgb, superimposed_rgb, _ = cam.explain(rgb_array)
    # Convert superimposed (RGB) back to BGR for consistency with the rest of the pipeline
    return cv2.cvtColor(superimposed_rgb, cv2.COLOR_RGB2BGR)
