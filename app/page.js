export default function HomePage() {
    return (
        <>
            <section className="hero">
                <div className="hero-content fade-in">
                    <div className="hero-badge">⚡ ML-Powered Analysis</div>
                    <h1>
                        Your AI <span>Bowling Coach</span><br />
                        Powered by Real ML
                    </h1>
                    <p>
                        Upload your bowling video and get instant biomechanical analysis using MediaPipe pose detection.
                        Real arm angles, wrist positions, run-up alignment — not simulations.
                    </p>
                    <a href="/analysis" className="hero-cta">
                        Start Analysis →
                    </a>
                </div>
            </section>

            <section className="features">
                <h2 className="features-title">Three AI Agents Working For You</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon blue">🧠</div>
                        <h3>Coach Agent</h3>
                        <p>
                            Identifies your main bowling mistake and gives precise corrections
                            with structured drills. Adapts advice based on your real biomechanical data.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon purple">📊</div>
                        <h3>Performance Analyst</h3>
                        <p>
                            Tracks your speed, accuracy, and swing trends across sessions.
                            Compares against pro benchmarks (130+ km/h, 85% accuracy, 70% swing)
                            and identifies your priority focus area.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon green">🤖</div>
                        <h3>ML Video Analysis</h3>
                        <p>
                            Uses MediaPipe PoseLandmarker to detect 33 body keypoints from your bowling video.
                            Calculates real arm angles, wrist deviation, run-up drift, and release timing using trigonometry.
                        </p>
                    </div>
                </div>
            </section>

            <section className="features">
                <h2 className="features-title">How It Works</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon blue">📹</div>
                        <h3>1. Upload Video</h3>
                        <p>
                            Record your bowling from the front or side view. Upload both for deeper analysis.
                            No video? Enter stats manually — the system adapts.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon purple">⚙️</div>
                        <h3>2. ML Processing</h3>
                        <p>
                            MediaPipe processes your video frame-by-frame in the browser to extract
                            pose landmarks. No data leaves your device during this step.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon green">📋</div>
                        <h3>3. Get Coaching</h3>
                        <p>
                            Three AI agents analyze your data simultaneously and return personalized
                            coaching, drills, training plans, and trend analytics — all in real-time.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
