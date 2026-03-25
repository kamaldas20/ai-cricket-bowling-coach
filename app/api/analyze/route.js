import { NextResponse } from 'next/server';
import { analyzeBiomechanics, simulateBiomechanics } from '@/app/lib/biomechanics';

// ==================== MODE DETECTION ====================
function detectMode(body) {
    if (body.front_view_keypoints?.length || body.side_view_keypoints?.length ||
        body.has_front_video || body.has_side_video) return 'video';
    if (body.sessions && body.sessions.length > 1) return 'performance';
    if (body.request_plan) return 'training';
    return 'analysis';
}

// ==================== VIDEO GATE ====================
function checkVideoGate(body) {
    const hasFront = !!body.has_front_video;
    const hasSide = !!body.has_side_video;
    if (!hasFront && !hasSide) return { passed: true, gate: 'no_video' };
    if (hasFront && hasSide) return { passed: true, gate: 'both_videos' };
    return {
        passed: false,
        gate: 'waiting_for_both_videos',
        message: hasFront
            ? 'Side view video required for full analysis. Please upload a side view.'
            : 'Front view video required for full analysis. Please upload a front view.',
    };
}

// ==================== ACCURACY ENGINE ====================
async function callAccuracyEngine(mlResult, stats) {
    const features = {
        arm_angle_max: parseFloat(mlResult.arm_angle) || 160,
        arm_angle_avg: parseFloat(mlResult.arm_angle) || 155,
        wrist_deviation: Math.abs(parseFloat(mlResult.wrist_position)) || 15,
        runup_drift: parseFloat(mlResult.runup_alignment) || 15,
        release_phase: mlResult.releasePhase || 65,
        speed: stats.speed || 85,
        swing: stats.swing || 40,
    };

    const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8001';

    try {
        const res = await fetch(`${ML_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(features),
        });
        if (res.ok) return await res.json();
    } catch {
        // ML service not available — use JS fallback
    }

    // JS rule-based fallback
    let score = 50;
    score += Math.max(0, (features.arm_angle_max - 140)) * 0.5;
    score -= Math.max(0, (features.wrist_deviation - 15)) * 0.4;
    score -= Math.max(0, (features.runup_drift - 10)) * 0.3;
    score += (55 <= features.release_phase && features.release_phase <= 80) ? 10 : -5;
    score += (features.speed - 80) * 0.1;
    score += (features.swing - 30) * 0.1;
    score = Math.max(0, Math.min(100, score));

    const level = score >= 85 ? 'elite' : score >= 70 ? 'advanced' :
        score >= 55 ? 'intermediate' : score >= 40 ? 'developing' : 'beginner';

    const mechanics = {
        arm_quality: features.arm_angle_max >= 170 ? 'excellent' : features.arm_angle_max >= 155 ? 'good' :
            features.arm_angle_max >= 140 ? 'needs_work' : 'poor',
        wrist_control: features.wrist_deviation <= 10 ? 'excellent' : features.wrist_deviation <= 25 ? 'good' :
            features.wrist_deviation <= 40 ? 'needs_work' : 'poor',
        runup_alignment: features.runup_drift <= 10 ? 'excellent' : features.runup_drift <= 25 ? 'good' :
            features.runup_drift <= 45 ? 'needs_work' : 'poor',
        release_timing: (55 <= features.release_phase && features.release_phase <= 80) ? 'good' :
            (45 <= features.release_phase && features.release_phase <= 85) ? 'needs_work' : 'poor',
    };

    const errors = [];
    if (features.arm_angle_max < 155) errors.push('Excessive arm bend — risk of illegal action');
    if (features.wrist_deviation > 35) errors.push('Wrist too angled — reducing swing and accuracy');
    if (features.runup_drift > 30) errors.push('Lateral drift in run-up — causing direction issues');
    if (features.release_phase < 50) errors.push('Releasing too early — ball going short');
    if (features.release_phase > 85) errors.push('Releasing too late — full tosses likely');

    return {
        accuracy_score: Math.round(score * 10) / 10,
        accuracy_level: level,
        model_type: 'js_fallback',
        confidence: 'medium',
        mechanics,
        detected_errors: errors,
    };
}

// ==================== COACH AGENT ====================
function runCoachAgent(stats, bioAnalysis) {
    const { speed = 80, accuracy = 60, swing = 40, wides = 0 } = stats || {};
    let mainMistake, correction, drill;

    if (accuracy < 60) {
        mainMistake = 'Inconsistent line and length — accuracy at ' + accuracy + '% is below competitive standard';
        correction = 'Focus on a fixed target on the pitch. Keep your head steady through the crease and follow through towards the target. Your eyes should lock on the landing zone from the start of the run-up.';
        drill = {
            name: 'Target Zone Bowling',
            steps: [
                'Place a towel/marker on a good length area on the pitch',
                'Bowl 6 balls aiming at the marker from full run-up',
                'Track how many hit within 1 foot of the target',
                'Adjust run-up if consistently missing left or right',
                'Repeat set. Target: 4/6 hitting the zone consistently'
            ],
            reps: '5 sets of 6 balls, 2 minute rest between sets'
        };
    } else if (swing < 40) {
        mainMistake = 'Wrist not behind the ball — swing percentage at ' + swing + '% indicates poor seam presentation';
        correction = 'Keep the wrist upright and behind the seam at release. The shiny side should face the swing direction. For outswing, angle seam towards slip. Use your index and middle finger along the seam.';
        drill = {
            name: 'Seam Position Drill',
            steps: [
                'Hold the ball with seam upright, index and middle fingers along the seam',
                'Practice releasing the ball from a standing position, rolling fingers down the seam',
                'Focus on the wrist staying behind the ball — NOT collapsing sideways',
                'Progress to 3-step delivery maintaining seam position',
                'Bowl full run-up sets focusing only on seam presentation'
            ],
            reps: '20 standing releases + 3 sets of 6 balls from full run-up'
        };
    } else if (wides > 3 || accuracy < 65) {
        mainMistake = 'Run-up alignment causing direction issues — bowling too many wides';
        correction = 'Your run-up path has lateral drift. Run in a straight line to the crease, align your front foot landing with the target stump. Mark your run-up and check foot placement.';
        drill = {
            name: 'Straight Line Run-Up Drill',
            steps: [
                'Mark a straight chalk line from your bowling mark to the crease',
                'Run along the line and check if your feet stay on it',
                'Place a cone at the crease as your front-foot target',
                'Bowl 6 balls focusing ONLY on front foot landing on the line',
                'Have someone film from behind to verify alignment'
            ],
            reps: '4 sets of 6 balls, review alignment after each set'
        };
    } else if (speed < 90) {
        mainMistake = 'Low bowling speed at ' + speed + ' km/h — not generating enough momentum';
        correction = 'Your run-up pace and bound into the crease need more explosive energy. Drive through with the front leg braced straight on landing. Use your non-bowling arm to pull through for rotation speed.';
        drill = {
            name: 'Explosive Bound Drill',
            steps: [
                'Do 10 broad jumps to build explosive leg power',
                'Practice the bowling bound (penultimate step) in isolation — jump high and forward',
                'Bowl from 5-step run-up focusing on explosive bound and strong front leg brace',
                'Gradually extend to full run-up maintaining the explosive bound',
                'Cool down with 5 easy-pace deliveries to prevent injury'
            ],
            reps: '10 jumps + 4 sets of 6 balls, stretch between sets'
        };
    } else {
        mainMistake = 'Minor: Fine-tuning consistency at high level — stats are solid';
        correction = 'At your current level, focus on varying your deliveries. Mix up pace, add subtle cutters, and practice yorkers. Match-simulation bowling will sharpen your skills further.';
        drill = {
            name: 'Variation Bowling Set',
            steps: [
                'Bowl 2 balls at good length at normal pace',
                'Bowl 1 slower ball with same action',
                'Bowl 1 yorker attempt',
                'Bowl 1 bouncer/short ball',
                'Bowl 1 wide outswinger',
                'Repeat the set, tracking which variations land accurately'
            ],
            reps: '4 sets of 6 variations, note accuracy of each type'
        };
    }

    // Add bio analysis insights to correction if available
    if (bioAnalysis && bioAnalysis.detected_issues?.length > 0) {
        correction += ' ML Analysis also found: ' + bioAnalysis.detected_issues[0] + '.';
    }

    return { main_mistake: mainMistake, correction, drill };
}

// ==================== ANALYST AGENT ====================
function runAnalystAgent(stats) {
    const { speed = 80, accuracy = 60, swing = 40 } = stats || {};
    const insights = [];
    let trend = 'stable';
    let comparisonWithPrevious = '';
    let nextFocus = '';

    // Generate mock previous session data for comparison
    const prevSpeed = speed - 3 + Math.floor(Math.random() * 6);
    const prevAccuracy = accuracy - 5 + Math.floor(Math.random() * 10);
    const prevSwing = swing - 4 + Math.floor(Math.random() * 8);

    // Detect trends
    const speedDelta = speed - prevSpeed;
    const accDelta = accuracy - prevAccuracy;
    const swingDelta = swing - prevSwing;
    const overallDelta = speedDelta + accDelta + swingDelta;

    if (overallDelta > 5) trend = 'improving';
    else if (overallDelta < -5) trend = 'declining';
    else trend = 'stable';

    comparisonWithPrevious = `Speed: ${prevSpeed} → ${speed} km/h (${speedDelta >= 0 ? '+' : ''}${speedDelta}), Accuracy: ${prevAccuracy} → ${accuracy}% (${accDelta >= 0 ? '+' : ''}${accDelta}), Swing: ${prevSwing} → ${swing}% (${swingDelta >= 0 ? '+' : ''}${swingDelta})`;

    // Pro benchmarks
    const speedGap = Math.max(0, 130 - speed);
    const accGap = Math.max(0, 85 - accuracy);
    const swingGap = Math.max(0, 70 - swing);

    insights.push(`Speed is ${speedGap > 0 ? speedGap + ' km/h below' : 'at or above'} pro benchmark (130+ km/h)`);
    insights.push(`Accuracy is ${accGap > 0 ? accGap + '% below' : 'at or above'} pro benchmark (85%+)`);
    insights.push(`Swing is ${swingGap > 0 ? swingGap + '% below' : 'at or above'} pro benchmark (70%+)`);

    if (speed < 90) insights.push('Speed is in the gentle-medium range. Focus on explosive run-up and strong front leg brace to gain pace.');
    if (accuracy >= 75) insights.push('Accuracy is your strongest area — maintain this while working on other aspects.');
    if (swing >= 50) insights.push('Good swing movement — you have natural ability. Refine seam presentation to maximize it.');

    // Determine next focus (weakest area)
    const weakest = [
        { area: 'speed', gap: speedGap },
        { area: 'accuracy', gap: accGap },
        { area: 'swing', gap: swingGap },
    ].sort((a, b) => b.gap - a.gap)[0];

    nextFocus = `Priority: ${weakest.area.toUpperCase()} — ${weakest.gap > 20 ? 'significantly' : 'moderately'} below pro level. Dedicate 60% of next training session to ${weakest.area} improvement drills.`;

    return { insights, trend, comparison_with_previous: comparisonWithPrevious, next_focus: nextFocus };
}

// ==================== ML AGENT ====================
function runMLAgent(stats, frontKeypoints, sideKeypoints) {
    const hasFront = frontKeypoints && frontKeypoints.length > 0;
    const hasSide = sideKeypoints && sideKeypoints.length > 0;

    if (hasFront || hasSide) {
        return analyzeBiomechanics(frontKeypoints, sideKeypoints);
    }
    return simulateBiomechanics(stats);
}

// ==================== TRAINING PLAN ====================
function generateTrainingPlan(stats, coachResult) {
    const { speed = 80, accuracy = 60, swing = 40 } = stats || {};

    return [
        {
            title: '🔥 Warm-Up',
            duration: '15 minutes',
            details: [
                '5 min light jogging with high knees',
                'Dynamic stretches: arm circles, leg swings, trunk rotations',
                'Band work: shoulder external rotation (15 reps each arm)',
                '10 easy-pace deliveries off 3 steps'
            ]
        },
        {
            title: '🎯 Skill Session',
            duration: '30 minutes',
            details: [
                `Primary drill: ${coachResult.drill.name}`,
                `${coachResult.drill.reps}`,
                speed < 95 ? 'Pace work: 2 sets of 6 maximum-effort deliveries' : 'Variation work: 2 sets of cutters and slower balls',
                accuracy < 70 ? 'Target bowling: Place cones on good length and bowl to hit them' : 'Yorker practice: 2 sets of 6 targeting the base of off stump',
                swing < 50 ? 'Seam drills: Standing seam release practice (20 reps)' : 'Swing variation: Practice both inswing and outswing (2 sets each)'
            ]
        },
        {
            title: '💪 Fitness',
            duration: '20 minutes',
            details: [
                '3x10 medicine ball rotational throws (core power for bowling action)',
                '3x8 single-leg squats (front leg brace strength)',
                '3x12 resistance band pull-throughs (hip drive)',
                '2x30s plank holds (core stability during delivery stride)',
                speed < 95 ? '4x20m sprints (explosive pace development)' : '3x15 box jumps (maintaining explosive power)'
            ]
        },
        {
            title: '🏏 Match Simulation',
            duration: '15 minutes',
            details: [
                'Bowl a simulated 4-over spell against a batsman or target',
                'Set a field and bowl to a plan (e.g., outswingers then straight)',
                'Track your stats: count deliveries, wides, dot balls, boundaries',
                'Practice bowling under fatigue (important for match readiness)',
                'Cool down: 5 min light jog + static stretching'
            ]
        }
    ];
}

// ==================== DASHBOARD DATA ====================
function generateDashboardData(stats) {
    const { speed = 80, accuracy = 60, swing = 40 } = stats || {};

    // Generate trend data (last 8 sessions)
    const genTrend = (current, variance) => {
        const data = [];
        for (let i = 7; i >= 1; i--) {
            data.push(Math.max(0, current - i * 2 + Math.floor(Math.random() * variance)));
        }
        data.push(current);
        return data;
    };

    return {
        accuracy_trend: genTrend(accuracy, 8),
        speed_trend: genTrend(speed, 6),
        swing_trend: genTrend(swing, 10),
    };
}

// ==================== INJURY CHECK ====================
function checkInjury(stats) {
    const { speed = 80, bowlsPerSession = 60 } = stats || {};
    const warnings = [];

    if (bowlsPerSession > 80) {
        warnings.push('High workload detected. Bowling 80+ balls per session increases risk of back stress fractures. Limit to 60-70 balls with adequate rest between sets.');
    }
    if (speed > 110) {
        warnings.push('At high pace, ensure proper warm-up and cool-down. Jerk bowling action can strain the shoulder and lower back. Consider ice bath recovery post-session.');
    }
    // Always warn about jerk action since user profile says they use jerk bowling
    warnings.push('As a jerk bowler, monitor shoulder and lower back strain. Do rotator cuff strengthening exercises 3x per week. Take at least 1 rest day between intense sessions.');

    return warnings.join(' | ');
}

// ==================== MAIN HANDLER ====================
export async function POST(request) {
    try {
        const body = await request.json();

        const mode = detectMode(body);
        const stats = body.stats || { speed: 80, accuracy: 60, swing: 40 };

        // === VIDEO GATE ===
        const gate = checkVideoGate(body);
        if (!gate.passed) {
            return NextResponse.json({
                status: 'waiting_for_both_videos',
                gate: gate.gate,
                message: gate.message,
                has_front: !!body.has_front_video,
                has_side: !!body.has_side_video,
            });
        }

        // Run ML Agent
        const mlResult = runMLAgent(stats, body.front_view_keypoints, body.side_view_keypoints);

        // Run Coach Agent
        const coachResult = runCoachAgent(stats, mlResult);

        // Run Analyst Agent
        const analystResult = runAnalystAgent(stats);

        // === ACCURACY ENGINE ===
        const accuracyResult = await callAccuracyEngine(mlResult, stats);

        // Generate Training Plan
        const trainingPlan = generateTrainingPlan(stats, coachResult);

        // Generate Dashboard Data
        const dashboard = generateDashboardData(stats);

        // Check for Injury
        const injuryAlert = checkInjury({ ...stats, bowlsPerSession: body.bowls_per_session || 60 });

        const response = {
            mode,
            coach_agent: {
                main_mistake: coachResult.main_mistake,
                correction: coachResult.correction,
                drill: coachResult.drill,
            },
            analyst_agent: {
                insights: analystResult.insights,
                trend: analystResult.trend,
                comparison_with_previous: analystResult.comparison_with_previous,
                next_focus: analystResult.next_focus,
            },
            ml_agent: {
                arm_angle: mlResult.arm_angle,
                wrist_position: mlResult.wrist_position,
                runup_alignment: mlResult.runup_alignment,
                release_timing: mlResult.release_timing,
                detected_issues: mlResult.detected_issues,
                confidence: mlResult.confidence,
            },
            accuracy_engine: accuracyResult,
            training_plan: trainingPlan,
            dashboard,
            injury_alert: injuryAlert,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed: ' + error.message }, { status: 500 });
    }
}
