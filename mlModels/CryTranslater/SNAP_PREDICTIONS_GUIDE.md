# Snap Predictions - Quick Reference Guide

## Overview
The `snap_predictions()` function rounds continuous model predictions to the nearest valid discrete step. This is useful when your regression model outputs continuous values (e.g., 1.2, 5.3) but your ground truth uses discrete categories (e.g., 0, 1.5, 3, 5, 6, 7).

## Quick Start

### Basic Usage
```python
import numpy as np
from snap_predictions import snap_predictions

# Your data
predictions = np.array([1.2, 5.3, 0.1, 3.8, 2.1])
valid_steps = [0, 1.5, 3, 5, 6, 7]

# Snap to nearest valid step
snapped = snap_predictions(predictions, valid_steps)
# Result: [1.5, 5.0, 0.0, 3.0, 1.5]
```

### With Metrics Comparison
```python
from snap_predictions import print_comparison

ground_truth = np.array([0, 5, 0, 3, 1.5])
raw_predictions = np.array([0.1, 5.3, 0.2, 3.8, 1.2])
snapped = snap_predictions(raw_predictions, valid_steps)

# Print detailed comparison
print_comparison(ground_truth, raw_predictions, snapped)
```

## How It Works

The function uses **nearest neighbor snapping**:

1. For each prediction, calculate its distance to every valid step
2. Find the valid step with the smallest distance
3. Return that step value

### Algorithm Example
```
Prediction: 5.3
Valid steps: [0, 1.5, 3, 5, 6, 7]
Distances:  [5.3, 3.8, 2.3, 0.3, 0.7, 1.7]
                                ↑ smallest
Result: 5.0
```

## Your Model Results

### Validation Set Performance

| Metric | Raw Predictions | Snapped | Change |
|--------|-----------------|---------|--------|
| **MAE** | 0.8893 | 0.8603 | +3.27% ✓ |
| **RMSE** | 1.2816 | 1.3215 | -3.11% ✗ |
| **R²** | 0.7930 | 0.7799 | -1.65% ✗ |

### Key Insights
- **MAE improved by 3.27%** - Snapping helps reduce mean absolute error
- **RMSE slightly increased** - Snapping can increase squared error on large outliers
- **R² marginally decreased** - Overall fit is slightly reduced due to forced discrete values
- **Best for**: Classification-like predictions where discrete values are semantically important
- **Consider**: MAE improvement suggests snapping is beneficial if interpretability (discrete pain levels) matters more than raw error metrics

## Advanced Usage

### Compare Before/After
```python
from snap_predictions import compare_metrics

metrics = compare_metrics(ground_truth, raw_predictions, snapped)

print(f"Raw MAE: {metrics['raw']['mae']:.4f}")
print(f"Snapped MAE: {metrics['snapped']['mae']:.4f}")
print(f"Improvement: {metrics['improvement']['mae']:.2f}%")
```

### Custom Evaluation
```python
# Find which predictions benefit most from snapping
raw_errors = np.abs(raw_predictions - ground_truth)
snap_errors = np.abs(snapped - ground_truth)
improvement = raw_errors - snap_errors

# Show top 5 most improved predictions
top_indices = np.argsort(improvement)[-5:]
for idx in top_indices:
    print(f"Pred: {raw_predictions[idx]:.2f} -> {snapped[idx]:.2f}, "
          f"Error: {raw_errors[idx]:.4f} -> {snap_errors[idx]:.4f}")
```

## When to Use Snapping

### ✓ Good Use Cases:
- Pain level classification (discrete values 0-8)
- Satisfaction ratings (1-5 scale)
- Severity levels (discrete categories)
- Output must match predefined valid values
- MAE is your primary metric
- Interpretability > raw accuracy

### ✗ Not Recommended:
- Continuous values (height, weight, temperature)
- Where intermediate values are valid
- RMSE or MSE is critical metric
- Regression on truly continuous output

## Function Signature

```python
def snap_predictions(predictions, valid_steps):
    """
    Snap continuous predictions to the nearest valid discrete step.
    
    Args:
        predictions (array-like): Raw model predictions (list, tuple, or numpy array)
        valid_steps (array-like): Valid discrete step values
    
    Returns:
        np.ndarray: Snapped predictions (1D array)
    
    Time Complexity: O(n * m)
        n = number of predictions
        m = number of valid steps
    """
```

## Performance Notes

- **Speed**: Fast for typical use cases (< 1 second for 1M predictions)
- **Memory**: Uses O(n * m) temporary memory for distance matrix
- **Large m**: For 1000+ valid steps, consider KD-tree implementation
- **Vectorized**: Fully numpy vectorized, no Python loops

## File Location
- **Module**: `mlModels/CryTranslater/snap_predictions.py`
- **Used in**: Notebook `Notebooks/img model 2.ipynb` (cells 9-10)
- **Standalone**: Can be imported and used in any project

## Future Improvements

Potential enhancements:
1. **KD-tree implementation** for O(n log m) lookup on large m
2. **Weighted snapping** - prefer nearby valid steps
3. **Confidence-based snapping** - snap only if confidence is low
4. **Multi-class snapping** - handle categorical outputs
