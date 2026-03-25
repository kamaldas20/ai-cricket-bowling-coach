/**
 * Biomechanics Analysis Engine
 * 
 * Performs real geometric calculations on MediaPipe pose keypoints
 * to extract bowling-specific biomechanical measurements.
 * 
 * MediaPipe Pose Landmarks Reference:
 * 11/12 = Left/Right Shoulder
 * 13/14 = Left/Right Elbow
 * 15/16 = Left/Right Wrist
 * 23/24 = Left/Right Hip
 * 25/26 = Left/Right Knee
 * 27/28 = Left/Right Ankle
 */

// Calculate angle between three points (in degrees)
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180 / Math.PI));
    if (angle > 180) angle = 360 - angle;
    return Math.round(angle * 10) / 10;
}

// Calculate distance between two points
function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// Calculate average visibility of a set of landmarks
function avgVisibility(landmarks, indices) {
    if (!landmarks || !landmarks.length) return 0;
    const sum = indices.reduce((acc, i) => acc + (landmarks[i]?.visibility || 0), 0);
    return sum / indices.length;
}

/**
 * Analyze arm angle from bowling arm (right arm by default)
 * Ideal bowling arm should be near-straight at release: 160-180°
 */
function analyzeArmAngle(frames, isRightArm = true) {
    const shoulder = isRightArm ? 12 : 11;
    const elbow = isRightArm ? 14 : 13;
    const wrist = isRightArm ? 16 : 15;

    const angles = [];
    for (const frame of frames) {
        if (!frame || !frame[shoulder] || !frame[elbow] || !frame[wrist]) continue;
        const vis = avgVisibility(frame, [shoulder, elbow, wrist]);
        if (vis < 0.5) continue;
        angles.push(calculateAngle(frame[shoulder], frame[elbow], frame[wrist]));
    }

    if (angles.length === 0) return { value: null, assessment: 'No data' };

    // Find max arm extension (release point is typically max extension)
    const maxAngle = Math.max(...angles);
    const avgAngle = Math.round(angles.reduce((a, b) => a + b, 0) / angles.length);

    let assessment;
    if (maxAngle >= 170) {
        assessment = 'Excellent - near straight arm at release (legal action)';
    } else if (maxAngle >= 155) {
        assessment = 'Good - slight bend within legal limits (15° tolerance)';
    } else if (maxAngle >= 140) {
        assessment = 'Warning - noticeable bend, risk of being called for chucking';
    } else {
        assessment = 'Issue - significant arm bend detected, likely illegal action';
    }

    return {
        value: `${maxAngle}° (max), ${avgAngle}° (avg)`,
        maxAngle,
        avgAngle,
        assessment,
        dataPoints: angles.length,
    };
}

/**
 * Analyze wrist position at release
 * For swing bowling: wrist should be behind the ball (upright to angled)
 */
function analyzeWristPosition(frames, isRightArm = true) {
    const elbow = isRightArm ? 14 : 13;
    const wrist = isRightArm ? 16 : 15;
    const shoulder = isRightArm ? 12 : 11;

    const wristAngles = [];
    for (const frame of frames) {
        if (!frame || !frame[elbow] || !frame[wrist] || !frame[shoulder]) continue;
        const vis = avgVisibility(frame, [elbow, wrist, shoulder]);
        if (vis < 0.5) continue;

        // Wrist deviation: angle of wrist relative to vertical line from elbow
        const wristDeviation = Math.atan2(
            wrist === 16 ? frame[16].x - frame[14].x : frame[15].x - frame[13].x,
            wrist === 16 ? frame[14].y - frame[16].y : frame[13].y - frame[15].y
        ) * (180 / Math.PI);
        wristAngles.push(Math.round(wristDeviation * 10) / 10);
    }

    if (wristAngles.length === 0) return { value: null, assessment: 'No data' };

    const avgDeviation = Math.round(wristAngles.reduce((a, b) => a + b, 0) / wristAngles.length);
    const absAvg = Math.abs(avgDeviation);

    let assessment;
    if (absAvg <= 10) {
        assessment = 'Upright seam position - ideal for seam bowling';
    } else if (absAvg <= 25) {
        assessment = 'Slightly angled - good for outswing/inswing depending on direction';
    } else if (absAvg <= 40) {
        assessment = 'Angled wrist - suitable for cross-seam or cutters';
    } else {
        assessment = 'Excessive wrist angle - may reduce control, focus on wrist stability';
    }

    return {
        value: `${avgDeviation}° average deviation`,
        avgDeviation,
        assessment,
        dataPoints: wristAngles.length,
    };
}

/**
 * Analyze run-up alignment
 * Measures lateral (sideways) drift of hips across frames
 * Ideal: minimal lateral movement, straight run to crease
 */
function analyzeRunupAlignment(frames) {
    const hipPositions = [];

    for (const frame of frames) {
        if (!frame || !frame[23] || !frame[24]) continue;
        const vis = avgVisibility(frame, [23, 24]);
        if (vis < 0.4) continue;
        const hipCenter = {
            x: (frame[23].x + frame[24].x) / 2,
            y: (frame[23].y + frame[24].y) / 2,
        };
        hipPositions.push(hipCenter);
    }

    if (hipPositions.length < 3) return { value: null, assessment: 'Insufficient data' };

    // Calculate lateral deviation from straight line (start to end)
    const startX = hipPositions[0].x;
    const endX = hipPositions[hipPositions.length - 1].x;
    const idealLineSlope = (endX - startX) / (hipPositions.length - 1);

    let totalDeviation = 0;
    let maxDeviation = 0;
    for (let i = 0; i < hipPositions.length; i++) {
        const expectedX = startX + idealLineSlope * i;
        const deviation = Math.abs(hipPositions[i].x - expectedX);
        totalDeviation += deviation;
        if (deviation > maxDeviation) maxDeviation = deviation;
    }

    const avgDeviation = totalDeviation / hipPositions.length;
    // Normalize to percentage (0 = perfectly straight, 100 = very drifted)
    const driftScore = Math.min(100, Math.round(avgDeviation * 1000));

    let assessment;
    if (driftScore <= 10) {
        assessment = 'Excellent - very straight run-up alignment';
    } else if (driftScore <= 25) {
        assessment = 'Good - minor lateral drift, acceptable';
    } else if (driftScore <= 45) {
        assessment = 'Moderate drift - may cause wides, work on running straight to target';
    } else {
        assessment = 'Significant lateral drift - causing accuracy issues, needs correction';
    }

    return {
        value: `${driftScore}% drift score`,
        driftScore,
        assessment,
        framesAnalyzed: hipPositions.length,
    };
}

/**
 * Analyze release timing
 * Detects the release point by finding the frame where wrist velocity peaks
 * Then checks arm angle at release and body position
 */
function analyzeReleaseTiming(frames, isRightArm = true) {
    const wristIdx = isRightArm ? 16 : 15;
    const shoulderIdx = isRightArm ? 12 : 11;
    const hipIdx = isRightArm ? 24 : 23;

    // Calculate wrist velocity between consecutive frames
    const velocities = [];
    for (let i = 1; i < frames.length; i++) {
        if (!frames[i]?.[wristIdx] || !frames[i - 1]?.[wristIdx]) continue;
        const dx = frames[i][wristIdx].x - frames[i - 1][wristIdx].x;
        const dy = frames[i][wristIdx].y - frames[i - 1][wristIdx].y;
        velocities.push({ frame: i, velocity: Math.sqrt(dx * dx + dy * dy) });
    }

    if (velocities.length < 3) return { value: null, assessment: 'Insufficient data' };

    // Find peak velocity (release point)
    const peakVelocity = velocities.reduce((max, v) => v.velocity > max.velocity ? v : max, velocities[0]);
    const releaseFrame = peakVelocity.frame;

    // Check if release is in the right phase (should be in upper body rotation phase)
    const releasePhase = releaseFrame / frames.length;

    let assessment;
    if (releasePhase >= 0.55 && releasePhase <= 0.8) {
        assessment = 'Good release timing - releasing at optimal point in delivery stride';
    } else if (releasePhase < 0.55) {
        assessment = 'Early release - ball may go short, hold the seam longer';
    } else {
        assessment = 'Late release - may cause full tosses, release earlier in the action';
    }

    // Check arm position at release
    let releaseArmAngle = null;
    if (frames[releaseFrame]) {
        const shoulder = frames[releaseFrame][shoulderIdx];
        const elbow = frames[releaseFrame][isRightArm ? 14 : 13];
        const wrist = frames[releaseFrame][wristIdx];
        if (shoulder && elbow && wrist) {
            releaseArmAngle = calculateAngle(shoulder, elbow, wrist);
        }
    }

    return {
        value: `Frame ${releaseFrame}/${frames.length} (${Math.round(releasePhase * 100)}% through action)`,
        releaseFrame,
        releasePhase: Math.round(releasePhase * 100),
        releaseArmAngle,
        assessment,
    };
}

/**
 * Main analysis function
 * Accepts keypoints from front and/or side view and returns complete biomechanical analysis
 */
export function analyzeBiomechanics(frontKeypoints, sideKeypoints) {
    const hasFront = frontKeypoints && frontKeypoints.length > 0;
    const hasSide = sideKeypoints && sideKeypoints.length > 0;

    // Use side view for arm/release analysis (better perspective), front for alignment
    const armFrames = hasSide ? sideKeypoints : (hasFront ? frontKeypoints : []);
    const alignFrames = hasFront ? frontKeypoints : (hasSide ? sideKeypoints : []);

    const armAngle = analyzeArmAngle(armFrames);
    const wristPosition = analyzeWristPosition(armFrames);
    const runupAlignment = analyzeRunupAlignment(alignFrames);
    const releaseTiming = analyzeReleaseTiming(armFrames);

    // Detect issues
    const detectedIssues = [];
    if (armAngle.maxAngle && armAngle.maxAngle < 155) {
        detectedIssues.push('Excessive arm bend detected - risk of illegal bowling action');
    }
    if (wristPosition.avgDeviation && Math.abs(wristPosition.avgDeviation) > 40) {
        detectedIssues.push('Wrist too angled at release - reducing swing and accuracy');
    }
    if (runupAlignment.driftScore && runupAlignment.driftScore > 30) {
        detectedIssues.push('Lateral drift in run-up - causing alignment issues with the crease');
    }
    if (releaseTiming.releasePhase && releaseTiming.releasePhase < 50) {
        detectedIssues.push('Releasing too early in bowling action - causing short deliveries');
    }
    if (releaseTiming.releasePhase && releaseTiming.releasePhase > 85) {
        detectedIssues.push('Releasing too late - causing full tosses');
    }

    // Calculate confidence based on data quality
    const totalDataPoints = (armAngle.dataPoints || 0) + (wristPosition.dataPoints || 0) +
        (runupAlignment.framesAnalyzed || 0);
    let confidence;
    if (hasFront && hasSide && totalDataPoints > 20) {
        confidence = 'high';
    } else if ((hasFront || hasSide) && totalDataPoints > 8) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    return {
        arm_angle: armAngle.value || 'Could not calculate',
        arm_angle_assessment: armAngle.assessment,
        wrist_position: wristPosition.value || 'Could not calculate',
        wrist_assessment: wristPosition.assessment,
        runup_alignment: runupAlignment.value || 'Could not calculate',
        runup_assessment: runupAlignment.assessment,
        release_timing: releaseTiming.value || 'Could not calculate',
        release_assessment: releaseTiming.assessment,
        detected_issues: detectedIssues,
        confidence,
        has_front_view: hasFront,
        has_side_view: hasSide,
    };
}

/**
 * Simulate biomechanical analysis when no video is provided
 * Uses performance stats to infer likely biomechanical factors
 */
export function simulateBiomechanics(stats) {
    const { speed = 80, accuracy = 60, swing = 40 } = stats || {};

    const detectedIssues = [];

    // Infer arm angle from speed
    let armAngle, armAssessment;
    if (speed >= 110) {
        armAngle = `${165 + Math.floor(Math.random() * 15)}° estimated`;
        armAssessment = 'Likely good extension based on speed output';
    } else if (speed >= 90) {
        armAngle = `${150 + Math.floor(Math.random() * 15)}° estimated`;
        armAssessment = 'Moderate extension - room for improvement';
    } else {
        armAngle = `${135 + Math.floor(Math.random() * 15)}° estimated`;
        armAssessment = 'Possible significant bend - upload video for accurate reading';
        detectedIssues.push('Low speed suggests possible arm bend or weak action');
    }

    // Infer wrist from swing
    let wristPos, wristAssessment;
    if (swing >= 60) {
        wristPos = `${5 + Math.floor(Math.random() * 10)}° estimated deviation`;
        wristAssessment = 'Good wrist position indicated by swing percentage';
    } else if (swing >= 40) {
        wristPos = `${15 + Math.floor(Math.random() * 15)}° estimated deviation`;
        wristAssessment = 'Moderate wrist control - some swing but inconsistent';
    } else {
        wristPos = `${30 + Math.floor(Math.random() * 20)}° estimated deviation`;
        wristAssessment = 'Poor wrist position likely - not enough seam presentation for swing';
        detectedIssues.push('Wrist position causing low swing - needs realignment');
    }

    // Infer alignment from accuracy
    let alignment, alignAssessment;
    if (accuracy >= 75) {
        alignment = `${5 + Math.floor(Math.random() * 8)}% drift estimated`;
        alignAssessment = 'Good alignment indicated by accuracy stats';
    } else if (accuracy >= 55) {
        alignment = `${15 + Math.floor(Math.random() * 15)}% drift estimated`;
        alignAssessment = 'Some drift likely - moderate accuracy';
    } else {
        alignment = `${30 + Math.floor(Math.random() * 20)}% drift estimated`;
        alignAssessment = 'Significant alignment issues likely based on low accuracy';
        detectedIssues.push('Run-up alignment causing accuracy problems');
    }

    // Release timing from speed/accuracy combo
    let release, releaseAssessment;
    const combo = (speed + accuracy) / 2;
    if (combo >= 80) {
        release = 'Estimated at 65-70% through action (good)';
        releaseAssessment = 'Likely good timing based on speed+accuracy combo';
    } else if (combo >= 60) {
        release = 'Estimated at 55-65% through action (slightly early)';
        releaseAssessment = 'May be releasing slightly early - needs video confirmation';
    } else {
        release = 'Estimated timing issue (needs video for accuracy)';
        releaseAssessment = 'Unable to determine precisely without video analysis';
        detectedIssues.push('Release timing likely off - upload video for precise analysis');
    }

    return {
        arm_angle: armAngle,
        arm_angle_assessment: armAssessment,
        wrist_position: wristPos,
        wrist_assessment: wristAssessment,
        runup_alignment: alignment,
        runup_assessment: alignAssessment,
        release_timing: release,
        release_assessment: releaseAssessment,
        detected_issues: detectedIssues,
        confidence: 'low',
        has_front_view: false,
        has_side_view: false,
        simulated: true,
    };
}
