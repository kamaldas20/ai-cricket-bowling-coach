import { NextResponse } from 'next/server';

// Mock session history data for dashboard
const sessions = [
    { date: '2026-03-01', speed: 82, accuracy: 54, swing: 32, notes: 'First recorded session' },
    { date: '2026-03-04', speed: 85, accuracy: 56, swing: 35, notes: 'Worked on seam position' },
    { date: '2026-03-07', speed: 84, accuracy: 60, swing: 38, notes: 'Focus on line and length' },
    { date: '2026-03-10', speed: 88, accuracy: 58, swing: 36, notes: 'Speed increase but less accurate' },
    { date: '2026-03-13', speed: 90, accuracy: 62, swing: 40, notes: 'Good overall improvement' },
    { date: '2026-03-16', speed: 89, accuracy: 65, swing: 42, notes: 'Consistency improving' },
    { date: '2026-03-19', speed: 92, accuracy: 63, swing: 45, notes: 'Best swing session yet' },
    { date: '2026-03-22', speed: 95, accuracy: 68, swing: 44, notes: 'Speed breakthrough!' },
];

export async function GET() {
    const speedTrend = sessions.map(s => s.speed);
    const accuracyTrend = sessions.map(s => s.accuracy);
    const swingTrend = sessions.map(s => s.swing);
    const dates = sessions.map(s => s.date);

    const latest = sessions[sessions.length - 1];
    const previous = sessions[sessions.length - 2];

    return NextResponse.json({
        sessions,
        trends: {
            speed_trend: speedTrend,
            accuracy_trend: accuracyTrend,
            swing_trend: swingTrend,
            dates,
        },
        latest_stats: latest,
        previous_stats: previous,
        pro_benchmark: {
            speed: 130,
            accuracy: 85,
            swing: 70,
        },
    });
}
