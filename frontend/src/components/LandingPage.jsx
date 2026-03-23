import React from 'react';

const LandingPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800">Become a Better Bowler</h1>
                <p className="mt-4 text-lg text-gray-600">Join us for the best cricket bowling coaching experience.</p>
                <a href="#" className="mt-8 inline-block bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600">Get Started</a>
            </div>
        </div>
    );
};

export default LandingPage;