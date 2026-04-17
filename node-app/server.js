const express = require('express');
const cors = require('cors');
const redis = require('redis');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(__dirname)); 
app.use(cors());
app.get('/list-files', (req, res) => {
    const directoryPath = '/downloads'; // Docker connected to the same folder
    
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory');
        }
        //get  video files and audio files
        const videoFiles = files.filter(file => file.endsWith('.mp4') || file.endsWith('.m4a'));
        res.json(videoFiles);
    });
});

app.use('/view-file', express.static('/downloads'));

app.use('/get-file', express.static(path.join(__dirname, '../downloads')))
// 1. Redis conected 
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.log('❌ Redis Error:', err));
redisClient.connect().then(() => console.log('✅ Node.js: Redis connected'));


// loding page
app.get('/start', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
    const videoURL = req.query.url;
    let requestedQuality = req.query.quality || '1080p';

    if (!videoURL) return res.status(400).send('Invalid YouTube URL');

    const loadingHTML = `
    <!DOCTYPE html>
    <html lang="si">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Processing Video...</title>
        <style>
            body {
                margin: 0; height: 100vh;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
                color: white; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center;
            }
            .spinner {
                width: 60px; height: 60px;
                border: 6px solid rgba(255, 255, 255, 0.1);
                border-top-color: #ff4757;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 25px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h2 { margin: 0; font-size: 26px; letter-spacing: 1px; animation: pulse 1.5s infinite alternate;}
            @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
            p { color: #dcdde1; font-size: 15px; margin-top: 15px; line-height: 1.6; }
            .highlight { color: #ff4757; font-weight: bold; }
        </style>
    </head>
    <body>
        <div id="loader" class="spinner"></div>
        <h2 id="title">Processing your video...</h2>
        <p id="msg">The video and audio are being merged.<br>
        <span class="highlight">Please wait...</span></p>
        
        <script>
            // conect with main.go file
            const url = "/download?url=${encodeURIComponent(videoURL)}&quality=${requestedQuality}";
            
            // conecrt whit main.go file and send the video url and quality
            fetch(url).then(response => {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('title').innerText = 'Download Started!';
                document.getElementById('msg').innerText = 'Your video is downloading in the background. You can check the Go Worker terminal.';
            });
        </script>
    </body>
    </html>
    `;
    res.send(loadingHTML);
});


app.get('/download', async (req, res) => {
    const videoURL = req.query.url;
    let requestedQuality = req.query.quality || '1080p';

    if (!videoURL) return res.status(400).send('Invalid YouTube URL');

    try {
        // Go Worker convert vedio as jason format and send to video_queue
        const jobData = JSON.stringify({ 
            url: videoURL, 
            quality: requestedQuality 
        });

        // video_queue to share the video download job with Go Worker
        await redisClient.lPush('video_queue', jobData);
        
        console.log(` send to Go Worker : ${videoURL} (${requestedQuality})`);
        res.send('Success'); // done 
        
    } catch (error) {
        console.error("Queue Error:", error);
        res.status(500).send('Error connecting to Queue');
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Node.js Server is running on port ${PORT}`);
});