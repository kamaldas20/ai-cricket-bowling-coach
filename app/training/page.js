'use client';

import { useState } from 'react';

export default function TrainingPage() {
    const [stats, setStats] = useState({ speed: 85, accuracy: 58, swing: 35 });
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);

    const generatePlan = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_plan: true,
                    stats,
                    description: 'Generate training plan',
                }),
            });
            const data = await res.json();
            setPlan(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>🏋️ Training Plan Generator</h1>
                <p>Get a personalized training plan based on your current performance level</p>
            </div>

            {/* Stats Input */}
            <div className="input-section" style={{ maxWidth: '600px', marginBottom: '1.5rem' }}>
                <h2>📊 Your Current Stats</h2>
                <div className="stat-sliders">
                    <div className="stat-slider">
                        <div className="stat-slider-header">
                            <span className="stat-slider-label">Speed (km/h)</span>
                            <span className="stat-slider-value">{stats.speed}</span>
                        </div>
                        <input type="range" min="60" max="150" value={stats.speed}
                            onChange={(e) => setStats(s => ({ ...s, speed: parseInt(e.target.value) }))} />
                    </div>
                    <div className="stat-slider">
                        <div className="stat-slider-header">
                            <span className="stat-slider-label">Accuracy (%)</span>
                            <span className="stat-slider-value">{stats.accuracy}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={stats.accuracy}
                            onChange={(e) => setStats(s => ({ ...s, accuracy: parseInt(e.target.value) }))} />
                    </div>
                    <div className="stat-slider">
                        <div className="stat-slider-header">
                            <span className="stat-slider-label">Swing (%)</span>
                            <span className="stat-slider-value">{stats.swing}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={stats.swing}
                            onChange={(e) => setStats(s => ({ ...s, swing: parseInt(e.target.value) }))} />
                    </div>
                </div>
                <button className="analyze-btn" onClick={generatePlan} disabled={loading}>
                    {loading ? <><div className="spinner" /> Generating...</> : '📋 Generate Training Plan'}
                </button>
            </div>

            {/* Training Plan Display */}
            {plan && (
                <div className="fade-in">
                    {/* Injury Alert */}
                    {plan.injury_alert && (
                        <div className="injury-alert">
                            <div className="injury-alert-icon">🩹</div>
                            <div className="injury-alert-text">{plan.injury_alert}</div>
                        </div>
                    )}

                    <div className="training-grid">
                        {plan.training_plan.map((block, i) => (
                            <div className="training-card" key={i}>
                                <div className="training-card-header">
                                    <div className="training-card-title">{block.title}</div>
                                    <div className="training-card-duration">{block.duration}</div>
                                </div>
                                <ul className="training-details">
                                    {block.details.map((detail, j) => (
                                        <li key={j}>{detail}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Quick Summary from Coach */}
                    {plan.coach_agent && (
                        <div className="drill-card" style={{ marginTop: '1.5rem' }}>
                            <h3>🎯 Priority Drill: {plan.coach_agent.drill.name}</h3>
                            <div className="agent-field">
                                <div className="agent-field-label">Focus Area</div>
                                <div className="agent-field-value">{plan.coach_agent.main_mistake}</div>
                            </div>
                            <ol className="drill-steps">
                                {plan.coach_agent.drill.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                            <div className="drill-reps">📋 {plan.coach_agent.drill.reps}</div>
                        </div>
                    )}

                    {/* Analyst Next Focus */}
                    {plan.analyst_agent && (
                        <div className="agent-card analyst" style={{ marginTop: '1.5rem' }}>
                            <div className="agent-header">
                                <div className="agent-icon analyst">📊</div>
                                <div>
                                    <div className="agent-title">Analyst Recommendation</div>
                                    <div className="agent-subtitle">Next Focus Area</div>
                                </div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-value" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                                    {plan.analyst_agent.next_focus}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!plan && !loading && (
                <div style={{
                    textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <p>Adjust your current stats above and hit generate to get a personalized training plan.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>The plan includes warm-up, skill drills, fitness exercises, and match simulation.</p>
                </div>
            )}
        </div>
    );
}
