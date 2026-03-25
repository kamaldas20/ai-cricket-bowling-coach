/**
 * Client-side Pose Detector using MediaPipe Vision
 * 
 * Processes uploaded video files frame-by-frame to extract
 * 33 body pose landmarks using the PoseLandmarker model.
 */

let poseLandmarker = null;
let isInitialized = false;

/**
 * Initialize MediaPipe PoseLandmarker
 * Loads the model from CDN (runs in browser, no server needed)
 */
export async function initPoseDetector() {
    if (isInitialized && poseLandmarker) return poseLandmarker;

    try {
        const vision = await import('@mediapipe/tasks-vision');
        const { PoseLandmarker, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
        });

        isInitialized = true;
        return poseLandmarker;
    } catch (error) {
        console.error('Failed to initialize PoseLandmarker:', error);
        throw new Error('Could not load ML model. Please check your internet connection.');
    }
}

/**
 * Process a video file and extract pose keypoints
 * @param {File} videoFile - The video file to process
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Array} Array of keypoint frames
 */
export async function processVideo(videoFile, onProgress) {
    const detector = await initPoseDetector();

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        const url = URL.createObjectURL(videoFile);
        video.src = url;

        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const fps = 10; // Sample at 10 fps for efficiency
            const totalFrames = Math.floor(duration * fps);
            const keypoints = [];
            let processedFrames = 0;

            // Create offscreen canvas for frame extraction
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            const processFrame = (time) => {
                return new Promise((res) => {
                    video.currentTime = time;
                    video.onseeked = () => {
                        ctx.drawImage(video, 0, 0);

                        try {
                            const result = detector.detectForVideo(video, time * 1000);
                            if (result.landmarks && result.landmarks.length > 0) {
                                keypoints.push(result.landmarks[0]);
                            }
                        } catch (e) {
                            // Skip frames that fail
                            console.warn('Frame processing error at', time, e);
                        }

                        processedFrames++;
                        if (onProgress) {
                            onProgress(Math.round((processedFrames / totalFrames) * 100));
                        }
                        res();
                    };
                });
            };

            try {
                // Process frames sequentially
                for (let i = 0; i < totalFrames; i++) {
                    const time = i / fps;
                    if (time > duration) break;
                    await processFrame(time);
                }

                URL.revokeObjectURL(url);
                resolve(keypoints);
            } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load video file'));
        };
    });
}

/**
 * Check if the browser supports MediaPipe
 */
export function isBrowserSupported() {
    return typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        !!window.WebAssembly;
}
