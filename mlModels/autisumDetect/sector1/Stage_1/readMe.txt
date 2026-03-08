# ASD Detection using Facial Geometry (Stage 2)

## 📌 Project Overview
This research focuses on identifying Autism Spectrum Disorder (ASD) markers through facial image analysis using a modified VGG-Face architecture.

## 📈 Stage 1 Results (Baseline)
- **Model 2:** Highest Accuracy (83.07%)
- **Model 5:** Highest Recall/Sensitivity (85.64%)
- **Status:** Baseline training and evaluation completed.

## 🚀 Stage 2: Specialist Model (In Progress)
Currently implementing advanced deep learning techniques to improve generalization:
- **Data:** 80/10/10 Triple-Split (Train/Val/Test).
- **Augmentation:** Random Flip, Rotation, and Contrast layers.
- **Regularization:** 50% Dropout to prevent overfitting.
- **Fine-Tuning:** Unfreezing VGG-Face Conv Blocks 4 & 5.

## 🛠 Tech Stack
- TensorFlow / Keras
- VGG-Face
- Scikit-Learn (Metrics)