import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier

class BowlingPredictor:
    def __init__(self, model_path):
        self.model = self.load_model(model_path)

    def load_model(self, model_path):
        with open(model_path, 'rb') as file:
            model = pickle.load(file)
        return model

    def predict(self, features):
        features = np.array(features).reshape(1, -1)
        prediction = self.model.predict(features)
        confidence = np.max(self.model.predict_proba(features))
        feedback = self.get_feedback(prediction)
        return prediction[0], confidence, feedback

    def get_feedback(self, prediction):
        feedback_dict = {
            'fast': 'Good pace! Keep maintaining your speed.' ,
            'spin': 'Great job! Focus on the spin technique.',
            'medium': 'Nice balance! Ensure your delivery is sharp.'
        }
        return feedback_dict.get(prediction[0], 'Keep practicing!')

# Example usage:
# predictor = BowlingPredictor('path_to_your_model.pkl')
# result, confidence, feedback = predictor.predict([feature_values])