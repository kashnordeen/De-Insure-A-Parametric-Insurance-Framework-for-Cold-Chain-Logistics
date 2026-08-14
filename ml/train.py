import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from imblearn.over_sampling import SMOTE
from model import LSTMFeatureExtractor, build_xgboost_classifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

def create_sequences(data, seq_length=60):
    sequences = []
    labels = []
    # Data columns: [temperature, humidity, vibration, s_t, spoilage_flag]
    for i in range(len(data) - seq_length):
        seq = data[i : i + seq_length, 0:1] # Just temp for LSTM
        label = data[i + seq_length - 1, 4] # Spoilage flag at the end of the window
        
        # Static features (max hum, max vib in the window)
        static_hum = np.max(data[i : i + seq_length, 1])
        static_vib = np.max(data[i : i + seq_length, 2])
        
        sequences.append((seq, static_hum, static_vib))
        labels.append(label)
        
    return sequences, np.array(labels)

print("Loading dataset...")
df = pd.read_csv('telemetry_data.csv')
data_arr = df.values

print("Creating sequences...")
sequences, labels = create_sequences(data_arr, seq_length=60)

# We have imbalanced data usually, but our synthetic data is somewhat balanced. 
# We still apply SMOTE on a flattened representation to adhere to the requirements.

# Flatten sequence + static features for SMOTE
flattened_X = []
for seq, h, v in sequences:
    flattened_X.append(np.concatenate([seq.flatten(), [h, v]]))
flattened_X = np.array(flattened_X)

print(f"Original class distribution: {np.bincount(labels.astype(int))}")
smote = SMOTE(sampling_strategy='minority')
X_resampled, y_resampled = smote.fit_resample(flattened_X, labels)
print(f"Resampled class distribution: {np.bincount(y_resampled.astype(int))}")

# Reconstruct sequences
X_seq_resampled = X_resampled[:, :-2].reshape(-1, 60, 1)
X_static_resampled = X_resampled[:, -2:]

# Split
X_train_seq, X_test_seq, X_train_stat, X_test_stat, y_train, y_test = train_test_split(
    X_seq_resampled, X_static_resampled, y_resampled, test_size=0.2, random_state=42
)

# Convert to tensors
X_train_seq_t = torch.tensor(X_train_seq, dtype=torch.float32)
y_train_t = torch.tensor(y_train, dtype=torch.long)

# 1. Train LSTM as feature extractor (Mock pre-training)
lstm = LSTMFeatureExtractor(input_dim=1, hidden_dim=32)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(lstm.parameters(), lr=0.001)

print("Training LSTM...")
dataset = TensorDataset(X_train_seq_t, y_train_t)
loader = DataLoader(dataset, batch_size=64, shuffle=True)

for epoch in range(2): # Short training for demonstration
    for batch_X, batch_y in loader:
        optimizer.zero_grad()
        hidden = lstm(batch_X)
        output = lstm.fc(hidden)
        loss = criterion(output, batch_y)
        loss.backward()
        optimizer.step()
print("LSTM Training complete.")

# 2. Extract features using trained LSTM
with torch.no_grad():
    train_features_lstm = lstm(X_train_seq_t).numpy()
    test_features_lstm = lstm(torch.tensor(X_test_seq, dtype=torch.float32)).numpy()

# Combine LSTM features with static features
X_train_xgb = np.hstack((train_features_lstm, X_train_stat))
X_test_xgb = np.hstack((test_features_lstm, X_test_stat))

# 3. Train XGBoost
print("Training XGBoost Classifier...")
xgb_model = build_xgboost_classifier()
xgb_model.fit(X_train_xgb, y_train)

# Evaluate
preds = xgb_model.predict(X_test_xgb)
acc = accuracy_score(y_test, preds)
print(f"Hybrid Model Accuracy: {acc * 100:.2f}%")
print("Classification Report:")
print(classification_report(y_test, preds))

# Save models
torch.save(lstm.state_dict(), 'lstm_model.pth')
xgb_model.save_model('xgboost_model.json')
print("Models saved.")
