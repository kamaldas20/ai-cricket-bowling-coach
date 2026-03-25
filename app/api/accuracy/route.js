import { NextResponse } from 'next/server';

/**
 * Standalone Accuracy Engine endpoint.
 * Proxies requests to the Python ML service.
 */
export async function POST(request) {
    try {
        const body = await request.json();

        const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8001';

        // Try the Python ML service first
        try {
            const mlRes = await fetch(`${ML_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    arm_angle_max: body.arm_angle_max ?? 160,
                    arm_angle_avg: body.arm_angle_avg ?? 155,
                    wrist_deviation: body.wrist_deviation ?? 15,
                    runup_drift: body.runup_drift ?? 15,
                    release_phase: body.release_phase ?? 65,
                    speed: body.speed ?? 85,
                    swing: body.swing ?? 40,
                }),
            });

            if (mlRes.ok) {
                const data = await mlRes.json();
                return NextResponse.json(data);
            }
        } catch {
            // ML service unavailable — use JS fallback
        }

        // JavaScript fallback — rule-based accuracy prediction
        const features = {
            arm: body.arm_angle_max ?? 160,
            wrist: body.wrist_deviation ?? 15,
            drift: body.runup_drift ?? 15,
            release: body.release_phase ?? 65,
            speed: body.speed ?? 85,
            swing: body.swing ?? 40,
        };

        let score = 50;
        score += Math.max(0, (features.arm - 140)) * 0.5;
        score -= Math.max(0, (features.wrist - 15)) * 0.4;
        score -= Math.max(0, (features.drift - 10)) * 0.3;
        score += (55 <= features.release && features.release <= 80) ? 10 : -5;
        score += (features.speed - 80) * 0.1;
        score += (features.swing - 30) * 0.1;
        score = Math.max(0, Math.min(100, score));

        const level = score >= 85 ? 'elite' : score >= 70 ? 'advanced' :
            score >= 55 ? 'intermediate' : score >= 40 ? 'developing' : 'beginner';

        // Mechanics assessment
        const mechanics = {
            arm_quality: features.arm >= 170 ? 'excellent' : features.arm >= 155 ? 'good' :
                features.arm >= 140 ? 'needs_work' : 'poor',
            wrist_control: features.wrist <= 10 ? 'excellent' : features.wrist <= 25 ? 'good' :
                features.wrist <= 40 ? 'needs_work' : 'poor',
            runup_alignment: features.drift <= 10 ? 'excellent' : features.drift <= 25 ? 'good' :
                features.drift <= 45 ? 'needs_work' : 'poor',
            release_timing: (55 <= features.release && features.release <= 80) ? 'good' :
                (45 <= features.release && features.release <= 85) ? 'needs_work' : 'poor',
        };

        const errors = [];
        if (features.arm < 155) errors.push('Excessive arm bend — risk of illegal action');
        if (features.wrist > 35) errors.push('Wrist too angled — reducing swing and accuracy');
        if (features.drift > 30) errors.push('Lateral drift in run-up — causing direction issues');
        if (features.release < 50) errors.push('Releasing too early — ball going short');
        if (features.release > 85) errors.push('Releasing too late — full tosses likely');

        return NextResponse.json({
            accuracy_score: Math.round(score * 10) / 10,
            accuracy_level: level,
            model_type: 'js_fallback',
            confidence: 'medium',
            mechanics,
            detected_errors: errors,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Accuracy prediction failed: ' + error.message }, { status: 500 });
    }
}
