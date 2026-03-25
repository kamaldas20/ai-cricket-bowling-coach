'use client';

import { useState, useRef, useMemo } from 'react';

export default function AnalysisPage() {
    const [description, setDescription] = useState('');
    const [stats, setStats] = useState({ speed: 85, accuracy: 58, swing: 35 });
    const [frontVideo, setFrontVideo] = useState(null);
    const [sideVideo, setSideVideo] = useState(null);
    const [frontPreviewUrl, setFrontPreviewUrl] = useState(null);
    const [sidePreviewUrl, setSidePreviewUrl] = useState(null);
    const [frontKeypoints, setFrontKeypoints] = useState(null);
    const [sideKeypoints, setSideKeypoints] = useState(null);
    const [poseStatus, setPoseStatus] = useState({ front: null, side: null });
    const [progress, setProgress] = useState({ front: 0, side: 0 });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const frontInputRef = useRef(null);
    const sideInputRef = useRef(null);

    // Video gate: both videos required for analysis when any video is uploaded
    const hasAnyVideo = !!(frontVideo || sideVideo);
    const hasBothVideos = !!(frontVideo && sideVideo);
    const videoGatePassed = !hasAnyVideo || hasBothVideos;
    const isProcessing = poseStatus.front === 'processing' || poseStatus.side === 'processing';

    const handleVideoUpload = async (file, view) => {
        if (!file) return;
        const setVideo = view === 'front' ? setFrontVideo : setSideVideo;
        const setPreview = view === 'front' ? setFrontPreviewUrl : setSidePreviewUrl;
        const setKp = view === 'front' ? setFrontKeypoints : setSideKeypoints;
        
        setVideo(file);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreview(url);

        setPoseStatus(prev => ({ ...prev, [view]: 'processing' }));

        try {
            const { processVideo, isBrowserSupported } = await import('../lib/poseDetector');

            if (!isBrowserSupported()) {
                setPoseStatus(prev => ({ ...prev, [view]: 'error' }));
                setError('Browser does not support ML processing. Stats-based analysis will be used.');
                return;
            }

            const keypoints = await processVideo(file, (p) => {
                setProgress(prev => ({ ...prev, [view]: p }));
            });

            setKp(keypoints);
            setPoseStatus(prev => ({ ...prev, [view]: 'done' }));
        } catch (err) {
            console.error('Pose detection error:', err);
            setPoseStatus(prev => ({ ...prev, [view]: 'error' }));
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                description,
                stats,
                front_view_keypoints: frontKeypoints || [],
                side_view_keypoints: sideKeypoints || [],
                has_front_video: !!frontVideo,
                has_side_video: !!sideVideo,
            };

            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();

            if (data.status === 'waiting_for_both_videos') {
                setError(data.message);
                return;
            }
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper: accuracy gauge color
    const gaugeColor = (score) => {
        if (score >= 80) return 'var(--accent-green)';
        if (score >= 60) return 'var(--accent-blue)';
        if (score >= 40) return 'var(--accent-orange)';
        return 'var(--accent-red)';
    };

    const mechanicsBadge = (val) => {
        const map = {
            excellent: { color: 'var(--accent-green)', label: 'Excellent' },
            good: { color: 'var(--accent-blue)', label: 'Good' },
            needs_work: { color: 'var(--accent-orange)', label: 'Needs Work' },
            poor: { color: 'var(--accent-red)', label: 'Poor' },
        };
        return map[val] || { color: 'var(--text-muted)', label: val };
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>🎯 Bowling Analysis</h1>
                <p>Upload your bowling videos or enter stats for AI-powered coaching feedback</p>
            </div>

            <div className="analysis-grid">
                {/* Left: Description & Stats */}
                <div className="input-section">
                    <h2>📝 Performance Description</h2>
                    <div className="textarea-wrap">
                        <textarea
                            id="description-input"
                            placeholder="Describe your recent bowling performance... e.g., 'Bowled 5 overs, gave 32 runs, took 1 wicket. Struggled with line outside off stump. Wides were a problem. Felt good pace but swing wasn't working.'"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="stat-sliders">
                        <div className="stat-slider">
                            <div className="stat-slider-header">
                                <span className="stat-slider-label">Speed (km/h)</span>
                                <span className="stat-slider-value">{stats.speed}</span>
                            </div>
                            <input
                                type="range" id="speed-slider" min="60" max="150" value={stats.speed}
                                onChange={(e) => setStats(s => ({ ...s, speed: parseInt(e.target.value) }))}
                            />
                        </div>
                        <div className="stat-slider">
                            <div className="stat-slider-header">
                                <span className="stat-slider-label">Accuracy (%)</span>
                                <span className="stat-slider-value">{stats.accuracy}%</span>
                            </div>
                            <input
                                type="range" id="accuracy-slider" min="0" max="100" value={stats.accuracy}
                                onChange={(e) => setStats(s => ({ ...s, accuracy: parseInt(e.target.value) }))}
                            />
                        </div>
                        <div className="stat-slider">
                            <div className="stat-slider-header">
                                <span className="stat-slider-label">Swing (%)</span>
                                <span className="stat-slider-value">{stats.swing}%</span>
                            </div>
                            <input
                                type="range" id="swing-slider" min="0" max="100" value={stats.swing}
                                onChange={(e) => setStats(s => ({ ...s, swing: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Video Upload */}
                <div className="input-section">
                    <h2>📹 Video Upload (ML Analysis)</h2>

                    {/* Video gate warning */}
                    {hasAnyVideo && !hasBothVideos && (
                        <div className="video-gate-banner">
                            <div className="video-gate-icon">⚠️</div>
                            <div className="video-gate-text">
                                <strong>Both videos required</strong> — Upload {!frontVideo ? 'front' : 'side'} view to enable full ML analysis.
                                You can still run stats-based analysis without videos.
                            </div>
                        </div>
                    )}

                    {/* Front View */}
                    <div
                        className={`video-upload-zone ${frontVideo ? 'has-file' : ''}`}
                        onClick={() => frontInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleVideoUpload(e.dataTransfer.files[0], 'front'); }}
                    >
                        <div className="upload-icon">{frontVideo ? '✅' : '📷'}</div>
                        <div className="upload-label">Front View Video</div>
                        <div className="upload-hint">{frontVideo ? '' : 'Click or drag to upload'}</div>
                        {frontVideo && <div className="upload-filename">{frontVideo.name}</div>}
                        <input ref={frontInputRef} type="file" accept="video/*" hidden
                            onChange={(e) => handleVideoUpload(e.target.files[0], 'front')} />
                    </div>

                    {/* Front Video Preview */}
                    {frontPreviewUrl && (
                        <div className="video-preview-wrap">
                            <video src={frontPreviewUrl} controls className="video-preview" />
                        </div>
                    )}

                    {poseStatus.front === 'processing' && (
                        <div className="pose-status processing">
                            🔄 Processing front view with MediaPipe... {progress.front}%
                            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress.front}%` }} /></div>
                        </div>
                    )}
                    {poseStatus.front === 'done' && (
                        <div className="pose-status done">✅ Front view analyzed — {frontKeypoints?.length} frames extracted</div>
                    )}
                    {poseStatus.front === 'error' && (
                        <div className="pose-status error">⚠️ ML processing failed — will use stats-based analysis</div>
                    )}

                    {/* Side View */}
                    <div
                        className={`video-upload-zone ${sideVideo ? 'has-file' : ''}`}
                        onClick={() => sideInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleVideoUpload(e.dataTransfer.files[0], 'side'); }}
                        style={{ marginTop: '0.75rem' }}
                    >
                        <div className="upload-icon">{sideVideo ? '✅' : '📐'}</div>
                        <div className="upload-label">Side View Video</div>
                        <div className="upload-hint">{sideVideo ? '' : 'Click or drag to upload'}</div>
                        {sideVideo && <div className="upload-filename">{sideVideo.name}</div>}
                        <input ref={sideInputRef} type="file" accept="video/*" hidden
                            onChange={(e) => handleVideoUpload(e.target.files[0], 'side')} />
                    </div>

                    {/* Side Video Preview */}
                    {sidePreviewUrl && (
                        <div className="video-preview-wrap">
                            <video src={sidePreviewUrl} controls className="video-preview" />
                        </div>
                    )}

                    {poseStatus.side === 'processing' && (
                        <div className="pose-status processing">
                            🔄 Processing side view with MediaPipe... {progress.side}%
                            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress.side}%` }} /></div>
                        </div>
                    )}
                    {poseStatus.side === 'done' && (
                        <div className="pose-status done">✅ Side view analyzed — {sideKeypoints?.length} frames extracted</div>
                    )}
                    {poseStatus.side === 'error' && (
                        <div className="pose-status error">⚠️ ML processing failed — will use stats-based analysis</div>
                    )}

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                        💡 Videos are processed locally in your browser using MediaPipe. No data is uploaded to any server.
                    </p>
                </div>
            </div>

            <button
                id="analyze-button"
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || isProcessing || (hasAnyVideo && !hasBothVideos)}
            >
                {loading ? <><div className="spinner" /> Analyzing...</> :
                    (hasAnyVideo && !hasBothVideos) ? '⏳ Upload Both Videos to Analyze' :
                        '🚀 Run AI Analysis'}
            </button>

            {error && (
                <div className="injury-alert" style={{ marginTop: '1rem' }}>
                    <div className="injury-alert-icon">⚠️</div>
                    <div className="injury-alert-text">{error}</div>
                </div>
            )}

            {/* ========== RESULTS ========== */}
            {results && (
                <div className="results-section fade-in">
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.3rem 1rem', borderRadius: '999px', marginBottom: '1.5rem',
                        background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase'
                    }}>
                        Mode: {results.mode}
                    </div>

                    {/* Injury Alert */}
                    {results.injury_alert && (
                        <div className="injury-alert">
                            <div className="injury-alert-icon">🩹</div>
                            <div className="injury-alert-text">{results.injury_alert}</div>
                        </div>
                    )}

                    {/* ========== ACCURACY ENGINE CARD ========== */}
                    {results.accuracy_engine && (
                        <div className="agent-card accuracy-engine-card">
                            <div className="agent-header">
                                <div className="agent-icon accuracy">🎯</div>
                                <div>
                                    <div className="agent-title">Accuracy Engine</div>
                                    <div className="agent-subtitle">ML Accuracy Prediction</div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className={`confidence-badge ${results.accuracy_engine.confidence}`}>
                                        {results.accuracy_engine.confidence}
                                    </span>
                                    <span style={{
                                        fontSize: '0.7rem', color: 'var(--text-muted)',
                                        padding: '0.15rem 0.5rem', background: 'var(--bg-primary)',
                                        borderRadius: '999px', fontWeight: 500
                                    }}>
                                        {results.accuracy_engine.model_type}
                                    </span>
                                </div>
                            </div>

                            {/* Accuracy Gauge */}
                            <div className="accuracy-gauge-wrap">
                                <div className="accuracy-gauge">
                                    <svg viewBox="0 0 120 70" className="accuracy-gauge-svg">
                                        <path
                                            d="M 10 65 A 50 50 0 0 1 110 65"
                                            fill="none"
                                            stroke="rgba(255,255,255,0.06)"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M 10 65 A 50 50 0 0 1 110 65"
                                            fill="none"
                                            stroke={gaugeColor(results.accuracy_engine.accuracy_score)}
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(results.accuracy_engine.accuracy_score / 100) * 157} 157`}
                                            className="gauge-fill"
                                        />
                                    </svg>
                                    <div className="accuracy-gauge-value" style={{ color: gaugeColor(results.accuracy_engine.accuracy_score) }}>
                                        {results.accuracy_engine.accuracy_score}
                                    </div>
                                    <div className="accuracy-gauge-label">ACCURACY SCORE</div>
                                </div>
                                <div className="accuracy-level-badge" style={{
                                    background: `${gaugeColor(results.accuracy_engine.accuracy_score)}20`,
                                    color: gaugeColor(results.accuracy_engine.accuracy_score),
                                    borderColor: gaugeColor(results.accuracy_engine.accuracy_score),
                                }}>
                                    {results.accuracy_engine.accuracy_level?.toUpperCase()}
                                </div>
                            </div>

                            {/* Mechanics Breakdown */}
                            {results.accuracy_engine.mechanics && (
                                <div className="mechanics-grid">
                                    {Object.entries(results.accuracy_engine.mechanics).map(([key, val]) => {
                                        const badge = mechanicsBadge(val);
                                        return (
                                            <div key={key} className="mechanic-item">
                                                <div className="mechanic-label">{key.replace(/_/g, ' ')}</div>
                                                <div className="mechanic-badge" style={{
                                                    background: `${badge.color}15`,
                                                    color: badge.color,
                                                    borderColor: `${badge.color}40`,
                                                }}>
                                                    {badge.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Detected Errors */}
                            {results.accuracy_engine.detected_errors?.length > 0 && (
                                <div className="agent-field" style={{ marginTop: '1rem' }}>
                                    <div className="agent-field-label">Detected Errors</div>
                                    <ul className="issues-list">
                                        {results.accuracy_engine.detected_errors.map((err, i) => (
                                            <li key={i}>⚠️ {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="results-grid">
                        {/* Coach Agent */}
                        <div className="agent-card coach">
                            <div className="agent-header">
                                <div className="agent-icon coach">🧠</div>
                                <div>
                                    <div className="agent-title">Coach Agent</div>
                                    <div className="agent-subtitle">Coaching Intelligence</div>
                                </div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">Main Mistake</div>
                                <div className="agent-field-value">{results.coach_agent.main_mistake}</div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">Correction</div>
                                <div className="agent-field-value">{results.coach_agent.correction}</div>
                            </div>
                        </div>

                        {/* Analyst Agent */}
                        <div className="agent-card analyst">
                            <div className="agent-header">
                                <div className="agent-icon analyst">📊</div>
                                <div>
                                    <div className="agent-title">Performance Analyst</div>
                                    <div className="agent-subtitle">Trend Detection</div>
                                </div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">Trend</div>
                                <div className="agent-field-value" style={{
                                    color: results.analyst_agent.trend === 'improving' ? 'var(--accent-green)' :
                                        results.analyst_agent.trend === 'declining' ? 'var(--accent-red)' : 'var(--accent-orange)'
                                }}>
                                    {results.analyst_agent.trend === 'improving' ? '📈' : results.analyst_agent.trend === 'declining' ? '📉' : '➡️'} {results.analyst_agent.trend.toUpperCase()}
                                </div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">vs Previous Session</div>
                                <div className="agent-field-value">{results.analyst_agent.comparison_with_previous}</div>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">Insights</div>
                                <ul className="insights-list">
                                    {results.analyst_agent.insights.map((insight, i) => (
                                        <li key={i}>{insight}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="agent-field">
                                <div className="agent-field-label">Next Focus</div>
                                <div className="agent-field-value" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                                    {results.analyst_agent.next_focus}
                                </div>
                            </div>
                        </div>

                        {/* ML Agent */}
                        <div className="agent-card ml">
                            <div className="agent-header">
                                <div className="agent-icon ml">🤖</div>
                                <div>
                                    <div className="agent-title">ML Video Analysis</div>
                                    <div className="agent-subtitle">Biomechanical Detection</div>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <span className={`confidence-badge ${results.ml_agent.confidence}`}>
                                        {results.ml_agent.confidence} confidence
                                    </span>
                                </div>
                            </div>
                            <div className="ml-metrics">
                                <div className="ml-metric">
                                    <div className="ml-metric-label">Arm Angle</div>
                                    <div className="ml-metric-value">{results.ml_agent.arm_angle}</div>
                                </div>
                                <div className="ml-metric">
                                    <div className="ml-metric-label">Wrist Position</div>
                                    <div className="ml-metric-value">{results.ml_agent.wrist_position}</div>
                                </div>
                                <div className="ml-metric">
                                    <div className="ml-metric-label">Run-up Alignment</div>
                                    <div className="ml-metric-value">{results.ml_agent.runup_alignment}</div>
                                </div>
                                <div className="ml-metric">
                                    <div className="ml-metric-label">Release Timing</div>
                                    <div className="ml-metric-value">{results.ml_agent.release_timing}</div>
                                </div>
                            </div>
                            {results.ml_agent.detected_issues?.length > 0 && (
                                <div className="agent-field" style={{ marginTop: '1rem' }}>
                                    <div className="agent-field-label">Detected Issues</div>
                                    <ul className="issues-list">
                                        {results.ml_agent.detected_issues.map((issue, i) => (
                                            <li key={i}>⚠️ {issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drill Card */}
                    {results.coach_agent.drill && (
                        <div className="drill-card">
                            <h3>🏋️ Recommended Drill: {results.coach_agent.drill.name}</h3>
                            <ol className="drill-steps">
                                {results.coach_agent.drill.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                            <div className="drill-reps">📋 {results.coach_agent.drill.reps}</div>
                        </div>
                    )}

                    {/* Raw JSON Toggle */}
                    <details style={{ marginTop: '1.5rem' }}>
                        <summary style={{
                            cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600
                        }}>
                            📄 View Raw JSON Response
                        </summary>
                        <pre style={{
                            marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)',
                            fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'auto', maxHeight: '400px'
                        }}>
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}
