"""
FastAPI ML service for BowlCoach Accuracy Engine.

Endpoints:
  POST /predict   — run inference (or rule-based fallback)
  POST /retrain   — re-train model from stored + new data
  GET  /health    — health check

Runs on port 8001.
"""

import json
import numpy as np
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from model import AccuracyModel

app = FastAPI(title="BowlCoach Accuracy Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Model loading ---
MODEL_PATH = str(Path(__file__).parent / "model.pkl")
LEARNING_PATH = str(Path(__file__).parent / "learning_data.json")
TRAINING_DATA_PATH = str(Path(__file__).parent / "training_data.npz")

model = AccuracyModel()
if not model.load(MODEL_PATH):
    print("⚠️  No pre-trained model found. Will use rule-based fallback until trained.")


# --- Schemas ---
class PredictRequest(BaseModel):
    arm_angle_max: float = Field(160, ge=100, le=180)
    arm_angle_avg: float = Field(155, ge=100, le=180)
    wrist_deviation: float = Field(15, ge=0, le=90)
    runup_drift: float = Field(15, ge=0, le=100)
    release_phase: float = Field(65, ge=0, le=100)
    speed: float = Field(85, ge=40, le=170)
    swing: float = Field(40, ge=0, le=100)


class MechanicsBreakdown(BaseModel):
    arm_quality: str
    wrist_control: str
    runup_alignment: str
    release_timing: str


class PredictResponse(BaseModel):
    accuracy_score: float
    accuracy_level: str
    model_type: str
    confidence: str
    mechanics: MechanicsBreakdown
    detected_errors: list[str]


# --- Helpers ---
def assess_mechanics(req: PredictRequest) -> MechanicsBreakdown:
    # Arm quality
    if req.arm_angle_max >= 170:
        arm = "excellent"
    elif req.arm_angle_max >= 155:
        arm = "good"
    elif req.arm_angle_max >= 140:
        arm = "needs_work"
    else:
        arm = "poor"

    # Wrist control
    if req.wrist_deviation <= 10:
        wrist = "excellent"
    elif req.wrist_deviation <= 25:
        wrist = "good"
    elif req.wrist_deviation <= 40:
        wrist = "needs_work"
    else:
        wrist = "poor"

    # Runup
    if req.runup_drift <= 10:
        runup = "excellent"
    elif req.runup_drift <= 25:
        runup = "good"
    elif req.runup_drift <= 45:
        runup = "needs_work"
    else:
        runup = "poor"

    # Release
    if 55 <= req.release_phase <= 80:
        release = "good"
    elif 45 <= req.release_phase <= 85:
        release = "needs_work"
    else:
        release = "poor"

    return MechanicsBreakdown(
        arm_quality=arm,
        wrist_control=wrist,
        runup_alignment=runup,
        release_timing=release,
    )


def detect_errors(req: PredictRequest) -> list[str]:
    errors = []
    if req.arm_angle_max < 155:
        errors.append("Excessive arm bend — risk of illegal action")
    if req.wrist_deviation > 35:
        errors.append("Wrist too angled — reducing swing and accuracy")
    if req.runup_drift > 30:
        errors.append("Lateral drift in run-up — causing direction issues")
    if req.release_phase < 50:
        errors.append("Releasing too early — ball going short")
    if req.release_phase > 85:
        errors.append("Releasing too late — full tosses likely")
    return errors


def store_learning_data(req: PredictRequest, prediction: dict):
    """Auto-learn: store predictions for future re-training."""
    entry = {
        "features": [
            req.arm_angle_max, req.arm_angle_avg, req.wrist_deviation,
            req.runup_drift, req.release_phase, req.speed, req.swing,
        ],
        "predicted_score": prediction["accuracy_score"],
    }
    data = []
    lp = Path(LEARNING_PATH)
    if lp.exists():
        try:
            data = json.loads(lp.read_text())
        except Exception:
            data = []
    data.append(entry)
    lp.write_text(json.dumps(data, indent=2))


# --- Endpoints ---
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    features = np.array([
        req.arm_angle_max, req.arm_angle_avg, req.wrist_deviation,
        req.runup_drift, req.release_phase, req.speed, req.swing,
    ])

    result = model.predict(features)
    mechanics = assess_mechanics(req)
    errors = detect_errors(req)

    # Auto-learn
    store_learning_data(req, result)

    return PredictResponse(
        accuracy_score=result["accuracy_score"],
        accuracy_level=result["accuracy_level"],
        model_type=result["model_type"],
        confidence=result["confidence"],
        mechanics=mechanics,
        detected_errors=errors,
    )


@app.post("/retrain")
async def retrain():
    """Re-train the model using original dataset + auto-learned data."""
    data_path = Path(TRAINING_DATA_PATH)
    if not data_path.exists():
        return {"status": "error", "message": "No training data found"}

    loaded = np.load(str(data_path))
    X, y = loaded["X"], loaded["y"]

    # Merge auto-learned data
    lp = Path(LEARNING_PATH)
    if lp.exists():
        try:
            learned = json.loads(lp.read_text())
            if learned:
                extra_X = np.array([e["features"] for e in learned])
                extra_y = np.array([e["predicted_score"] for e in learned])
                X = np.vstack([X, extra_X])
                y = np.concatenate([y, extra_y])
        except Exception:
            pass

    model.train(X, y)
    model.save(MODEL_PATH)

    return {"status": "ok", "samples": len(y)}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model.is_trained,
        "model_type": "ml" if model.is_trained else "rule_based",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
