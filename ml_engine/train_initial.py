"""
Generate synthetic bowling dataset and train the initial AccuracyModel.

Each sample models realistic bowling biomechanics:
  - arm_angle_max / avg correlate with legal action quality
  - wrist_deviation inversely correlates with accuracy
  - runup_drift inversely correlates with accuracy
  - release_phase has an optimal zone (~60-75%)
  - speed and swing add minor bonuses

Run:  python train_initial.py
"""

import numpy as np
from pathlib import Path
from model import AccuracyModel


def generate_dataset(n: int = 200, seed: int = 42) -> tuple:
    rng = np.random.default_rng(seed)
    X = np.zeros((n, 7))
    y = np.zeros(n)

    for i in range(n):
        # Arm angle max: 130-180 (higher = better)
        arm_max = rng.uniform(130, 180)
        arm_avg = arm_max - rng.uniform(5, 15)
        # Wrist deviation: 0-50 (lower = better)
        wrist = rng.uniform(0, 50)
        # Runup drift: 0-60 (lower = better)
        drift = rng.uniform(0, 60)
        # Release phase: 40-95 (optimal ~60-75)
        release = rng.uniform(40, 95)
        # Speed: 70-145 km/h
        speed = rng.uniform(70, 145)
        # Swing: 10-90%
        swing = rng.uniform(10, 90)

        X[i] = [arm_max, arm_avg, wrist, drift, release, speed, swing]

        # Ground truth accuracy formula (synthetic)
        acc = 30.0
        acc += (arm_max - 130) * 0.6            # arm quality
        acc -= wrist * 0.5                       # wrist penalty
        acc -= drift * 0.4                       # drift penalty
        # Optimal release window bonus
        release_bonus = max(0, 15 - abs(release - 68)) * 1.2
        acc += release_bonus
        acc += (speed - 80) * 0.08               # slight speed contribution
        acc += (swing - 30) * 0.05               # slight swing contribution
        # Add noise
        acc += rng.normal(0, 3)
        y[i] = np.clip(acc, 0, 100)

    return X, y


def main():
    print("🏏 Generating synthetic bowling dataset (200 samples)...")
    X, y = generate_dataset(200)

    print(f"   Features shape: {X.shape}")
    print(f"   Target range:   {y.min():.1f} — {y.max():.1f}")
    print(f"   Target mean:    {y.mean():.1f}")

    model = AccuracyModel()
    model.train(X, y)

    # Quick validation
    pred = model.predict(np.array([170, 162, 10, 12, 67, 130, 65]))
    print(f"\n✅ Model trained. Sample prediction: {pred}")

    model_path = str(Path(__file__).parent / "model.pkl")
    model.save(model_path)
    print(f"💾 Model saved to {model_path}")

    # Save dataset for auto-learning reference
    data_path = str(Path(__file__).parent / "training_data.npz")
    np.savez(data_path, X=X, y=y)
    print(f"📊 Training data saved to {data_path}")


if __name__ == "__main__":
    main()
