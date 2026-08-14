"""
De-Insure Multi-Epoch Multi-Fold ML Training Engine
Executes 5-Fold Stratified Cross-Validation across 50 Epochs with Learning Rate Scheduling.
Computes & Exports Precision, Recall, F1-Score, Confusion Matrix, and ROC-AUC.
"""

import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

from dataset_loader import generate_cold_chain_dataset
from model import ColdChainSpoilageNN

# Configuration
EPOCHS = 50
BATCH_SIZE = 32
LEARNING_RATE = 0.005
N_SPLITS = 5
SEED = 42

def train_pipeline():
    print("=" * 65)
    print("  De-Insure ML Pipeline: Multi-Epoch 5-Fold Cross-Validation")
    print("=" * 65)

    df = generate_cold_chain_dataset(samples=2500, seed=SEED)
    
    feature_cols = [
        "mean_temp", "max_temp", "min_temp", "temp_std", "mkt",
        "humidity", "duration_minutes", "excursion_ratio", "critical_spike"
    ]
    
    X = df[feature_cols].values
    y = df["spoilage_label"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)

    fold_metrics = []
    best_model_state = None
    best_f1 = 0.0

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_scaled, y), 1):
        print(f"\n--- Training Fold {fold}/{N_SPLITS} ---")

        X_train, y_train = torch.tensor(X_scaled[train_idx], dtype=torch.float32), torch.tensor(y[train_idx], dtype=torch.float32).unsqueeze(1)
        X_val, y_val = torch.tensor(X_scaled[val_idx], dtype=torch.float32), torch.tensor(y[val_idx], dtype=torch.float32).unsqueeze(1)

        train_dataset = TensorDataset(X_train, y_train)
        train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)

        model = ColdChainSpoilageNN(input_dim=len(feature_cols))
        criterion = nn.BCELoss()
        optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

        for epoch in range(1, EPOCHS + 1):
            model.train()
            train_loss = 0.0
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad()
                preds = model(batch_x)
                loss = criterion(preds, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item() * batch_x.size(0)

            train_loss /= len(train_loader.dataset)

            # Validation
            model.eval()
            with torch.no_grad():
                val_preds = model(X_val)
                val_loss = criterion(val_preds, y_val).item()

            scheduler.step(val_loss)

            if epoch % 10 == 0 or epoch == EPOCHS:
                print(f"  Epoch [{epoch:02d}/{EPOCHS}] | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        # Fold Evaluation
        model.eval()
        with torch.no_grad():
            raw_probs = model(X_val).numpy().flatten()
            binary_preds = (raw_probs >= 0.5).astype(int)

        p = precision_score(y[val_idx], binary_preds, zero_division=0)
        r = recall_score(y[val_idx], binary_preds, zero_division=0)
        f1 = f1_score(y[val_idx], binary_preds, zero_division=0)
        auc = roc_auc_score(y[val_idx], raw_probs)
        cm = confusion_matrix(y[val_idx], binary_preds).tolist()

        fold_metrics.append({
            "fold": fold,
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
            "confusion_matrix": cm
        })

        print(f"  --> Fold {fold} Metrics | Precision: {p:.4f} | Recall: {r:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")

        if f1 > best_f1:
            best_f1 = f1
            best_model_state = model.state_dict()

    # Mean Metrics across Folds
    mean_precision = float(np.mean([m["precision"] for m in fold_metrics]))
    mean_recall = float(np.mean([m["recall"] for m in fold_metrics]))
    mean_f1 = float(np.mean([m["f1_score"] for m in fold_metrics]))
    mean_auc = float(np.mean([m["roc_auc"] for m in fold_metrics]))

    summary = {
        "dataset_samples": len(df),
        "features": feature_cols,
        "epochs": EPOCHS,
        "k_folds": N_SPLITS,
        "mean_metrics": {
            "precision": round(mean_precision, 4),
            "recall": round(mean_recall, 4),
            "f1_score": round(mean_f1, 4),
            "roc_auc": round(mean_auc, 4)
        },
        "fold_details": fold_metrics
    }

    print("\n" + "=" * 65)
    print("  FINAL MULTI-FOLD EVALUATION SUMMARY")
    print("=" * 65)
    print(f"  Average Precision : {mean_precision:.4f}")
    print(f"  Average Recall    : {mean_recall:.4f}")
    print(f"  Average F1 Score  : {mean_f1:.4f}")
    print(f"  Average ROC-AUC   : {mean_auc:.4f}")

    # Save Model Weights & Scaler
    model_dir = os.path.dirname(__file__)
    torch.save(best_model_state, os.path.join(model_dir, "spoilage_nn.pth"))

    import joblib
    joblib.dump(scaler, os.path.join(model_dir, "scaler.joblib"))

    report_path = os.path.join(model_dir, "metrics_report.json")
    with open(report_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[SUCCESS] Model checkpoint saved to 'ml/spoilage_nn.pth'")
    print(f"[SUCCESS] Scaler saved to 'ml/scaler.joblib'")
    print(f"[SUCCESS] Metrics report saved to 'ml/metrics_report.json'\n")

if __name__ == "__main__":
    train_pipeline()
