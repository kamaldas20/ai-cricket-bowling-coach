'use client';

import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const chartOptions = (title, color) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
            backgroundColor: 'rgba(10, 14, 26, 0.9)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { size: 11 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#64748b', font: { size: 11 } },
        },
    },
    elements: {
        line: { tension: 0.4 },
        point: { radius: 4, hoverRadius: 6 },
    },
});

function makeChartData(labels, data, color, label) {
    const rgb = color === 'blue' ? '59,130,246' : color === 'green' ? '16,185,129' : '139,92,246';
    return {
        labels,
        datasets: [{
            label,
            data,
            borderColor: `rgb(${rgb})`,
            backgroundColor: `rgba(${rgb}, 0.1)`,
            fill: true,
            pointBackgroundColor: `rgb(${rgb})`,
            pointBorderColor: '#0a0e1a',
            pointBorderWidth: 2,
        }],
    };
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/sessions')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page">
                <div className="loading-overlay">
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (!data) return <div className="page"><p>Failed to load data.</p></div>;

    const latest = data.latest_stats;
    const prev = data.previous_stats;
    const pro = data.pro_benchmark;
    const dates = data.trends.dates.map(d => d.slice(5)); // MM-DD format

    return (
        <div className="page">
            <div className="page-header">
                <h1>📊 Performance Dashboard</h1>
                <p>Track your bowling progress across sessions and benchmark against pro standards</p>
            </div>

            {/* Stat Cards */}
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-card-value">{latest.speed}</div>
                    <div className="stat-card-label">Speed (km/h)</div>
                    <div className={`stat-card-trend ${latest.speed >= prev.speed ? 'up' : 'down'}`}>
                        {latest.speed >= prev.speed ? '↑' : '↓'} {Math.abs(latest.speed - prev.speed)} vs prev
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{latest.accuracy}%</div>
                    <div className="stat-card-label">Accuracy</div>
                    <div className={`stat-card-trend ${latest.accuracy >= prev.accuracy ? 'up' : 'down'}`}>
                        {latest.accuracy >= prev.accuracy ? '↑' : '↓'} {Math.abs(latest.accuracy - prev.accuracy)}% vs prev
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{latest.swing}%</div>
                    <div className="stat-card-label">Swing</div>
                    <div className={`stat-card-trend ${latest.swing >= prev.swing ? 'up' : 'down'}`}>
                        {latest.swing >= prev.swing ? '↑' : '↓'} {Math.abs(latest.swing - prev.swing)}% vs prev
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{data.sessions.length}</div>
                    <div className="stat-card-label">Sessions</div>
                    <div className="stat-card-trend up">Tracked</div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="chart-card">
                    <h3>🏎️ Speed Trend</h3>
                    <Line
                        options={chartOptions('Speed', 'blue')}
                        data={makeChartData(dates, data.trends.speed_trend, 'blue', 'Speed (km/h)')}
                    />
                </div>
                <div className="chart-card">
                    <h3>🎯 Accuracy Trend</h3>
                    <Line
                        options={chartOptions('Accuracy', 'green')}
                        data={makeChartData(dates, data.trends.accuracy_trend, 'green', 'Accuracy (%)')}
                    />
                </div>
                <div className="chart-card">
                    <h3>🌀 Swing Trend</h3>
                    <Line
                        options={chartOptions('Swing', 'purple')}
                        data={makeChartData(dates, data.trends.swing_trend, 'purple', 'Swing (%)')}
                    />
                </div>
            </div>

            {/* Pro Benchmark Comparison */}
            <div className="benchmark-section">
                <h3>🏆 Pro Benchmark Comparison</h3>
                <div className="benchmark-bars">
                    {[
                        { label: 'Speed', current: latest.speed, pro: pro.speed, unit: 'km/h', color: '#3b82f6' },
                        { label: 'Accuracy', current: latest.accuracy, pro: pro.accuracy, unit: '%', color: '#10b981' },
                        { label: 'Swing', current: latest.swing, pro: pro.swing, unit: '%', color: '#8b5cf6' },
                    ].map((item) => (
                        <div className="benchmark-bar" key={item.label}>
                            <div className="benchmark-bar-header">
                                <span className="benchmark-bar-label">{item.label}</span>
                                <span className="benchmark-bar-values">You: {item.current}{item.unit} | Pro: {item.pro}{item.unit}</span>
                            </div>
                            <div className="benchmark-bar-track">
                                <div
                                    className="benchmark-bar-fill"
                                    style={{
                                        width: `${Math.min(100, (item.current / item.pro) * 100)}%`,
                                        background: item.color,
                                    }}
                                />
                                <div className="benchmark-bar-pro" style={{ left: '100%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Session History */}
            <div style={{ marginTop: '1.5rem' }}>
                <div className="benchmark-section">
                    <h3>📋 Session History</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    {['Date', 'Speed', 'Accuracy', 'Swing', 'Notes'].map(h => (
                                        <th key={h} style={{
                                            textAlign: 'left', padding: '0.75rem', color: 'var(--text-muted)',
                                            fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.sessions.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{s.date}</td>
                                        <td style={{ padding: '0.75rem', color: 'var(--accent-blue)' }}>{s.speed} km/h</td>
                                        <td style={{ padding: '0.75rem', color: 'var(--accent-green)' }}>{s.accuracy}%</td>
                                        <td style={{ padding: '0.75rem', color: 'var(--accent-purple)' }}>{s.swing}%</td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{s.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
