import React from 'react';

const ResultDashboard = ({ bowlingStyle, armAngle, confidenceScore, feedbackTips }) => {
    return (
        <div className="p-4 bg-gray-100 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Bowling Result Dashboard</h2>
            <div className="mb-2">
                <span className="font-semibold">Bowling Style:</span> {bowlingStyle}
            </div>
            <div className="mb-2">
                <span className="font-semibold">Arm Angle:</span> {armAngle}°
            </div>
            <div className="mb-2">
                <span className="font-semibold">Confidence Score:</span> {confidenceScore}/10
            </div>
            <div className="mb-2">
                <span className="font-semibold">Feedback Tips:</span>
                <ul className="list-disc ml-5">
                    {feedbackTips.map((tip, index) => (
                        <li key={index} className="text-gray-700">{tip}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ResultDashboard;