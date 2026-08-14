import torch
import torch.nn as nn
import xgboost as xgb

class LSTMFeatureExtractor(nn.Module):
    def __init__(self, input_dim=1, hidden_dim=32, num_layers=2):
        super(LSTMFeatureExtractor, self).__init__()
        self.hidden_dim = hidden_dim
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        # Dummy linear layer if we were to train end-to-end, but we use XGBoost on the hidden state
        self.fc = nn.Linear(hidden_dim, 2) 

    def forward(self, x):
        # x shape: (batch_size, seq_len, input_dim)
        lstm_out, (h_n, c_n) = self.lstm(x)
        # We take the output of the last time step
        last_hidden = lstm_out[:, -1, :] 
        return last_hidden

def build_xgboost_classifier():
    # Ingests LSTM hidden state + static features
    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    return model
