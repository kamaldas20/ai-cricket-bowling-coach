"""
AccuracyModel — sklearn-based bowling accuracy prediction model.

Features (7-dimensional vector):
  0: arm_angle_max       (degrees, 100-180)
  1: arm_angle_avg       (degrees, 100-180)
  2: wrist_deviation     (degrees, 0-60)
  3: runup_drift         (%, 0-100)
  4: release_phase       (%, 0-100)
  5: speed               (km/h, 60-150)
  6: swing               (%, 0-100)

Target: accuracy score (0-100)
"""

import pickle
import numpy as np
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


class AccuracyModel:
    """Wraps a sklearn Ridge regression pipeline for bowling accuracy prediction."""

    FEATURE_NAMES = [
        "arm_angle_max", "arm_angle_avg", "wrist_deviation",
        "runup_drift", "release_phase", "speed", "swing"
    ]

    def __init__(self):
        self.pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge(alpha=1.0))
        ])
        self.is_trained = False

    def train(self, X: np.ndarray, y: np.ndarray):
        """Fit the model on feature matrix X and target vector y."""
        self.pipeline.fit(X, y)
        self.is_trained = True

    def predict(self, features: np.ndarray) -> dict:
        """
        Predict accuracy from a single feature vector.
        Returns dict with score, level, and confidence.
        """
        if not self.is_trained:
            return self._rule_based_fallback(features)

        raw = self.pipeline.predict(features.reshape(1, -1))[0]
        score = float(np.clip(raw, 0, 100))

        return {
            "accuracy_score": round(score, 1),
            "accuracy_level": self._score_to_level(score),
            "model_type": "ml",
            "confidence": self._calc_confidence(features),
        }

    def _rule_based_fallback(self, features: np.ndarray) -> dict:
        """Heuristic fallback when model isn't trained."""
        f = features.flatten()
        arm = f[0] if len(f) > 0 else 160
        wrist = f[2] if len(f) > 2 else 15
        drift = f[3] if len(f) > 3 else 20
        release = f[4] if len(f) > 4 else 65
        speed = f[5] if len(f) > 5 else 85
        swing = f[6] if len(f) > 6 else 40

        score = 50.0
        score += max(0, (arm - 140)) * 0.5        # reward straight arm
        score -= max(0, (wrist - 15)) * 0.4        # penalize wrist angle
        score -= max(0, (drift - 10)) * 0.3        # penalize drift
        score += 10 if 55 <= release <= 80 else -5  # reward good timing
        score += (speed - 80) * 0.1                 # slight speed bonus
        score += (swing - 30) * 0.1                 # slight swing bonus
        score = float(np.clip(score, 0, 100))

        return {
            "accuracy_score": round(score, 1),
            "accuracy_level": self._score_to_level(score),
            "model_type": "rule_based",
            "confidence": "low",
        }

    @staticmethod
    def _score_to_level(score: float) -> str:
        if score >= 85:
            return "elite"
        elif score >= 70:
            return "advanced"
        elif score >= 55:
            return "intermediate"
        elif score >= 40:
            return "developing"
        else:
            return "beginner"

    @staticmethod
    def _calc_confidence(features: np.ndarray) -> str:
        f = features.flatten()
        # Higher confidence when arm angle data is real (>140 suggests real measurement)
        arm = f[0] if len(f) > 0 else 0
        if arm > 140:
            return "high"
        elif arm > 100:
            return "medium"
        return "low"

    def save(self, path: str):
        with open(path, "wb") as f:
            pickle.dump({"pipeline": self.pipeline, "is_trained": self.is_trained}, f)

    def load(self, path: str):
        p = Path(path)
        if not p.exists():
            return False
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.pipeline = data["pipeline"]
        self.is_trained = data["is_trained"]
        return True
