#!/usr/bin/env python3
"""
TRINETRA: Fire Inhale Edge-AI Random Forest Classifier Training Pipeline
Generates synthetic multi-modal temporal time-series sensor data and trains an ensemble
decision forest for embedded deployment on edge sensor nodes (ESP32/Edge microcontrollers).
"""

import json
import math
import os
import random

# Seed for reproducibility
random.seed(42)

FEATURE_NAMES = [
    "temperature", "humidity", "smoke", "co", "acoustic",
    "temp_delta", "smoke_delta", "co_delta",
    "temp_rate", "smoke_rate", "co_rate",
    "temp_moving_avg", "smoke_moving_avg",
    "persistence", "neighbour_confirmations"
]

def generate_sample(label):
    """
    Generate realistic multi-modal environmental signature vector based on state.
    Labels: 0 = NORMAL, 1 = SUSPICIOUS, 2 = FIRE
    """
    if label == 0:  # NORMAL
        temp = random.gauss(24.0, 3.0)
        humidity = random.gauss(62.0, 6.0)
        smoke = random.gauss(15.0, 4.0)
        co = random.gauss(2.5, 0.8)
        acoustic = random.gauss(0.12, 0.04)
        
        temp_delta = random.gauss(0.2, 0.4)
        smoke_delta = random.gauss(0.5, 0.8)
        co_delta = random.gauss(0.1, 0.2)
        
        temp_rate = temp_delta / 30.0
        smoke_rate = smoke_delta / 30.0
        co_rate = co_delta / 30.0
        
        temp_ma = temp - (temp_delta / 2.0)
        smoke_ma = smoke - (smoke_delta / 2.0)
        persistence = random.choice([0, 0, 1])
        neighbour_conf = random.choice([0, 0, 0, 1])
        
    elif label == 1:  # SUSPICIOUS
        temp = random.gauss(34.0, 3.5)
        humidity = random.gauss(42.0, 5.0)
        smoke = random.gauss(75.0, 18.0)
        co = random.gauss(7.0, 1.8)
        acoustic = random.gauss(0.38, 0.08)
        
        temp_delta = random.gauss(4.5, 1.2)
        smoke_delta = random.gauss(25.0, 6.0)
        co_delta = random.gauss(2.8, 0.9)
        
        temp_rate = temp_delta / 30.0
        smoke_rate = smoke_delta / 30.0
        co_rate = co_delta / 30.0
        
        temp_ma = temp - (temp_delta / 2.0)
        smoke_ma = smoke - (smoke_delta / 2.0)
        persistence = random.choice([2, 3, 4])
        neighbour_conf = random.choice([0, 1, 2])
        
    else:  # FIRE
        temp = random.gauss(54.0, 8.0)
        humidity = random.gauss(22.0, 6.0)
        smoke = random.gauss(280.0, 50.0)
        co = random.gauss(22.0, 5.0)
        acoustic = random.gauss(0.78, 0.12)
        
        temp_delta = random.gauss(14.0, 3.5)
        smoke_delta = random.gauss(140.0, 30.0)
        co_delta = random.gauss(12.0, 3.0)
        
        temp_rate = temp_delta / 30.0
        smoke_rate = smoke_delta / 30.0
        co_rate = co_delta / 30.0
        
        temp_ma = temp - (temp_delta / 2.0)
        smoke_ma = smoke - (smoke_delta / 2.0)
        persistence = random.choice([5, 6, 7, 8])
        neighbour_conf = random.choice([2, 3])
        
    # Clamp natural bounds
    humidity = max(5.0, min(100.0, humidity))
    smoke = max(0.0, smoke)
    co = max(0.0, co)
    acoustic = max(0.0, min(1.0, acoustic))
    
    return [
        temp, humidity, smoke, co, acoustic,
        temp_delta, smoke_delta, co_delta,
        temp_rate, smoke_rate, co_rate,
        temp_ma, smoke_ma,
        float(persistence), float(neighbour_conf)
    ]

class DecisionNode:
    def __init__(self, feature_idx=None, threshold=None, left=None, right=None, value=None):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value

    def to_dict(self):
        if self.value is not None:
            return {"value": self.value}
        return {
            "feature": FEATURE_NAMES[self.feature_idx],
            "feature_idx": self.feature_idx,
            "threshold": round(self.threshold, 4),
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None
        }

def gini_impurity(y):
    if not y:
        return 0
    total = len(y)
    counts = {}
    for label in y:
        counts[label] = counts.get(label, 0) + 1
    return 1.0 - sum((c / total) ** 2 for c in counts.values())

def best_split(X, y, feature_subset):
    best_gain = -1.0
    best_feat = None
    best_thresh = None
    current_gini = gini_impurity(y)
    
    for feat_idx in feature_subset:
        values = sorted(set(row[feat_idx] for row in X))
        # sample some split thresholds
        if len(values) > 10:
            step = len(values) // 10
            values = values[::step]
        for val in values:
            left_y = [y[i] for i in range(len(y)) if X[i][feat_idx] <= val]
            right_y = [y[i] for i in range(len(y)) if X[i][feat_idx] > val]
            if not left_y or not right_y:
                continue
            p_left = len(left_y) / len(y)
            p_right = len(right_y) / len(y)
            gain = current_gini - (p_left * gini_impurity(left_y) + p_right * gini_impurity(right_y))
            if gain > best_gain:
                best_gain = gain
                best_feat = feat_idx
                best_thresh = val
                
    return best_feat, best_thresh

def build_tree(X, y, depth=0, max_depth=5, min_samples=5):
    # If pure or max depth reached
    if len(set(y)) == 1 or depth >= max_depth or len(y) < min_samples:
        counts = {0: 0, 1: 0, 2: 0}
        for label in y:
            counts[label] = counts.get(label, 0) + 1
        total = len(y) if y else 1
        probs = [counts.get(0, 0) / total, counts.get(1, 0) / total, counts.get(2, 0) / total]
        return DecisionNode(value=probs)
        
    num_features = len(FEATURE_NAMES)
    k = int(math.sqrt(num_features)) + 1
    feature_subset = random.sample(range(num_features), k)
    
    feat_idx, thresh = best_split(X, y, feature_subset)
    if feat_idx is None:
        counts = {0: 0, 1: 0, 2: 0}
        for label in y:
            counts[label] = counts.get(label, 0) + 1
        total = len(y) if y else 1
        probs = [counts.get(0, 0) / total, counts.get(1, 0) / total, counts.get(2, 0) / total]
        return DecisionNode(value=probs)
        
    left_X, left_y, right_X, right_y = [], [], [], []
    for i in range(len(X)):
        if X[i][feat_idx] <= thresh:
            left_X.append(X[i])
            left_y.append(y[i])
        else:
            right_X.append(X[i])
            right_y.append(y[i])
            
    left_node = build_tree(left_X, left_y, depth + 1, max_depth, min_samples)
    right_node = build_tree(right_X, right_y, depth + 1, max_depth, min_samples)
    return DecisionNode(feature_idx=feat_idx, threshold=thresh, left=left_node, right=right_node)

def predict_tree(node, x):
    if node.value is not None:
        return node.value
    if x[node.feature_idx] <= node.threshold:
        return predict_tree(node.left, x)
    else:
        return predict_tree(node.right, x)

def train_random_forest(n_trees=15):
    print(f"Generating 1,500 training samples across NORMAL, SUSPICIOUS, FIRE classes...")
    X_train, y_train = [], []
    for _ in range(500):
        X_train.append(generate_sample(0))
        y_train.append(0)
    for _ in range(500):
        X_train.append(generate_sample(1))
        y_train.append(1)
    for _ in range(500):
        X_train.append(generate_sample(2))
        y_train.append(2)
        
    # Generate test set
    X_test, y_test = [], []
    for _ in range(150):
        X_test.append(generate_sample(0))
        y_test.append(0)
    for _ in range(150):
        X_test.append(generate_sample(1))
        y_test.append(1)
    for _ in range(150):
        X_test.append(generate_sample(2))
        y_test.append(2)
        
    print(f"Training Random Forest ({n_trees} decision trees)...")
    trees = []
    for t in range(n_trees):
        # Bootstrap sample
        indices = [random.randint(0, len(X_train) - 1) for _ in range(len(X_train))]
        boot_X = [X_train[i] for i in indices]
        boot_y = [y_train[i] for i in indices]
        tree = build_tree(boot_X, boot_y, depth=0, max_depth=5, min_samples=4)
        trees.append(tree)
        
    # Evaluate
    correct = 0
    confusion_matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    for i in range(len(X_test)):
        probs = [0.0, 0.0, 0.0]
        for tree in trees:
            p = predict_tree(tree, X_test[i])
            probs[0] += p[0]
            probs[1] += p[1]
            probs[2] += p[2]
        pred_label = probs.index(max(probs))
        actual = y_test[i]
        confusion_matrix[actual][pred_label] += 1
        if pred_label == actual:
            correct += 1
            
    accuracy = correct / len(X_test)
    print(f"Test Accuracy: {accuracy * 100:.2f}% (on prototype synthetic verification dataset)")
    
    # Calculate precision, recall, f1 for FIRE (class 2)
    tp = confusion_matrix[2][2]
    fp = confusion_matrix[0][2] + confusion_matrix[1][2]
    fn = confusion_matrix[2][0] + confusion_matrix[2][1]
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 1.0
    
    model_data = {
        "model_name": "Fire Inhale Random Forest Ensemble",
        "version": "1.0-prototype",
        "num_trees": n_trees,
        "feature_names": FEATURE_NAMES,
        "metrics": {
            "dataset_type": "Prototype / Simulation Dataset",
            "test_samples": len(X_test),
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": confusion_matrix
        },
        "trees": [t.to_dict() for t in trees]
    }
    
    os.makedirs("models", exist_ok=True)
    with open("models/fire_inhale_model.json", "w") as f:
        json.dump(model_data, f, indent=2)
    print("Saved model to models/fire_inhale_model.json successfully!")
    
    # Save a joblib placeholder for Python pipeline compatibility
    with open("models/fire_inhale_model.joblib", "w") as f:
        f.write("# TRINETRA Fire Inhale Model Weight Binary\n")
        f.write(json.dumps({"status": "exported", "trees": n_trees, "f1": f1}))

if __name__ == "__main__":
    train_random_forest()
