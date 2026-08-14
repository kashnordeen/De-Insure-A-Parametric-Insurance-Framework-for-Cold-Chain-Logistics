"""
De-Insure PyTorch & XGBoost Spoilage Prediction Models
Deep Neural Classifier & Gradient Boosted Decision Engine
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class ColdChainSpoilageNN(nn.Module):
    """
    Deep Neural Network Classifier for Cargo Spoilage Risk Prediction.
    Architecture: Dense -> BatchNorm -> ReLU -> Dropout -> Dense -> Sigmoid
    """
    def __init__(self, input_dim=9):
        super(ColdChainSpoilageNN, self).__init__()
        self.fc1 = nn.Linear(input_dim, 64)
        self.bn1 = nn.BatchNorm1d(64)
        self.dropout1 = nn.Dropout(0.3)

        self.fc2 = nn.Linear(64, 32)
        self.bn2 = nn.BatchNorm1d(32)
        self.dropout2 = nn.Dropout(0.2)

        self.fc3 = nn.Linear(32, 16)
        self.fc4 = nn.Linear(16, 1)

    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout1(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout2(x)
        x = F.relu(self.fc3(x))
        out = torch.sigmoid(self.fc4(x))
        return out
