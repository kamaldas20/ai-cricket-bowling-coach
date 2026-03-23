const express = require('express');
const multer = require('multer');
const axios = require('axios');

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        // Forward the video file to Python FastAPI service
        const response = await axios.post('http://your-fastapi-service/upload', req.file.buffer, {
            headers: {
                'Content-Type': req.file.mimetype
            }
        });
        res.status(response.status).send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading video');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
