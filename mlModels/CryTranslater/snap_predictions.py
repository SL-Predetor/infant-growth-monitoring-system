"""
Snap Predictions Module
======================
Utility function to snap continuous model predictions to discrete valid steps.

Useful for regression models trained on continuous values but evaluated on discrete categories
(e.g., pain levels at 0, 1.5, 3.0, 5.0, 6.0, 7.0).
"""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def snap_predictions(predictions, valid_steps):
    """
    Snap continuous predictions to the nearest valid discrete step.
    
    This function rounds continuous model predictions to the nearest value in a list of 
    valid discrete steps. Useful when your model was trained on continuous values but 
    your ground truth or evaluation uses discrete categories.
    
    Parameters
    ----------
    predictions : array-like
        Raw continuous model predictions. Can be a list, tuple, or numpy array.
        
    valid_steps : array-like
        Valid discrete step values. All predictions will be rounded to one of these values.
        
    Returns
    -------
    np.ndarray
        Array of predictions snapped to the nearest valid step, maintaining the original shape.
        
    Examples
    --------
    >>> import numpy as np
    >>> predictions = np.array([1.2, 5.3, 0.1, 3.8, 2.1])
    >>> valid_steps = [0, 1.5, 3, 5, 6, 7]
    >>> snapped = snap_predictions(predictions, valid_steps)
    >>> snapped
    array([1.5, 5. , 0. , 3. , 1.5])
    
    >>> # Works with 2D arrays too
    >>> predictions_2d = np.array([[1.2, 5.3], [0.1, 3.8]])
    >>> snapped_2d = snap_predictions(predictions_2d, valid_steps)
    >>> snapped_2d.shape
    (4,)  # Flattened to 1D
    
    Notes
    -----
    - Input shape is flattened; output is always 1D
    - If a prediction is equidistant from two steps, numpy's argmin chooses the first one
    - Time complexity: O(n * m) where n = num predictions, m = num valid steps
    - For large m, consider building a KD-tree for O(n log m) lookup
    """
    # Convert to numpy arrays and flatten
    predictions = np.asarray(predictions, dtype=np.float32).flatten()
    valid_steps = np.asarray(valid_steps, dtype=np.float32)
    
    # Create distance matrix: shape (n_predictions, n_steps)
    # Each row contains distances from one prediction to all valid steps
    distances = np.abs(predictions[:, np.newaxis] - valid_steps[np.newaxis, :])
    
    # Find the index of the closest valid step for each prediction
    closest_indices = np.argmin(distances, axis=1)
    
    # Map indices to actual step values
    snapped = valid_steps[closest_indices]
    
    return snapped


def compare_metrics(ground_truth, raw_predictions, snapped_predictions):
    """
    Compare model performance before and after snapping predictions.
    
    Parameters
    ----------
    ground_truth : array-like
        Ground truth labels.
        
    raw_predictions : array-like
        Raw continuous model predictions.
        
    snapped_predictions : array-like
        Predictions after snapping to discrete steps.
        
    Returns
    -------
    dict
        Dictionary containing metrics for both raw and snapped predictions:
        {
            'raw': {'mae': float, 'rmse': float, 'r2': float},
            'snapped': {'mae': float, 'rmse': float, 'r2': float},
            'improvement': {'mae': float, 'rmse': float, 'r2': float}  # percent change
        }
    """
    ground_truth = np.asarray(ground_truth).flatten()
    raw_predictions = np.asarray(raw_predictions).flatten()
    snapped_predictions = np.asarray(snapped_predictions).flatten()
    
    # Calculate metrics for raw predictions
    raw_mae = mean_absolute_error(ground_truth, raw_predictions)
    raw_rmse = np.sqrt(mean_squared_error(ground_truth, raw_predictions))
    raw_r2 = r2_score(ground_truth, raw_predictions)
    
    # Calculate metrics for snapped predictions
    snap_mae = mean_absolute_error(ground_truth, snapped_predictions)
    snap_rmse = np.sqrt(mean_squared_error(ground_truth, snapped_predictions))
    snap_r2 = r2_score(ground_truth, snapped_predictions)
    
    # Calculate percent improvements
    mae_improvement = ((raw_mae - snap_mae) / raw_mae) * 100
    rmse_improvement = ((raw_rmse - snap_rmse) / raw_rmse) * 100
    r2_improvement = ((snap_r2 - raw_r2) / raw_r2) * 100 if raw_r2 != 0 else 0
    
    return {
        'raw': {
            'mae': raw_mae,
            'rmse': raw_rmse,
            'r2': raw_r2
        },
        'snapped': {
            'mae': snap_mae,
            'rmse': snap_rmse,
            'r2': snap_r2
        },
        'improvement': {
            'mae': mae_improvement,  # positive means snapped is better
            'rmse': rmse_improvement,
            'r2': r2_improvement
        }
    }


def print_comparison(ground_truth, raw_predictions, snapped_predictions):
    """
    Pretty-print comparison of metrics before and after snapping.
    
    Parameters
    ----------
    ground_truth : array-like
        Ground truth labels.
        
    raw_predictions : array-like
        Raw continuous model predictions.
        
    snapped_predictions : array-like
        Predictions after snapping to discrete steps.
    """
    metrics = compare_metrics(ground_truth, raw_predictions, snapped_predictions)
    
    print("\n" + "=" * 70)
    print("PREDICTION SNAPPING COMPARISON")
    print("=" * 70)
    
    print("\nBefore Snapping (Continuous Predictions):")
    print(f"  MAE:  {metrics['raw']['mae']:.6f}")
    print(f"  RMSE: {metrics['raw']['rmse']:.6f}")
    print(f"  R²:   {metrics['raw']['r2']:.6f}")
    
    print("\nAfter Snapping (Discrete Predictions):")
    print(f"  MAE:  {metrics['snapped']['mae']:.6f}")
    print(f"  RMSE: {metrics['snapped']['rmse']:.6f}")
    print(f"  R²:   {metrics['snapped']['r2']:.6f}")
    
    print("\nImprovement (% change):")
    print(f"  MAE:  {metrics['improvement']['mae']:+.2f}% {'✓' if metrics['improvement']['mae'] > 0 else '✗'}")
    print(f"  RMSE: {metrics['improvement']['rmse']:+.2f}% {'✓' if metrics['improvement']['rmse'] > 0 else '✗'}")
    print(f"  R²:   {metrics['improvement']['r2']:+.2f}% {'✓' if metrics['improvement']['r2'] > 0 else '✗'}")
    
    print("=" * 70 + "\n")


if __name__ == "__main__":
    # Example usage
    print("snap_predictions module - Example usage")
    print("-" * 50)
    
    # Define test data
    valid_steps = [0, 1.5, 3, 5, 6, 7]
    ground_truth = np.array([0, 1.5, 3, 5, 6, 7, 0, 3, 5])
    raw_predictions = np.array([0.1, 1.6, 2.8, 5.2, 5.9, 7.1, 0.3, 3.5, 4.8])
    
    # Snap predictions
    snapped = snap_predictions(raw_predictions, valid_steps)
    
    print(f"Raw predictions:     {raw_predictions}")
    print(f"Snapped predictions: {snapped}")
    print(f"Ground truth:        {ground_truth}")
    
    # Compare metrics
    print_comparison(ground_truth, raw_predictions, snapped)
