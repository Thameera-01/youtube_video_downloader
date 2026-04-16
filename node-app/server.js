const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const app = express();
app.use(cors());

app.get('/start', (req, res) => {
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
        <div class="spinner"></div>
        <h2>Processing your video...</h2>
        <p>The video and audio are being merged. This may take a few minutes.<br>
        <span class="highlight">Please wait without closing this tab!</span></p>
        
        <script>
           <body>
        <div id="loader" class="spinner"></div>
        <div id="success" class="success-icon">✅</div>

        <h2 id="title">Processing your video...</h2>
        <p id="msg">prosesing the video</p>
        
        <script>
            const url = "/download?url=${encodeURIComponent(videoURL)}&quality=${requestedQuality}";
            
            window.location.href = url;

            let checkDownload = setInterval(() => {
               
            }, 1000);

            
            
            window.addEventListener('blur', () => {
                
                document.getElementById('loader').style.display = 'none';
                document.getElementById('success').style.display = 'block';
                document.getElementById('title').innerText = 'Download Started!';
                document.getElementById('msg').innerText = 'Now, your video is downloading in the background. You can close this tab or start another download.';
            });
        

        </script>
    </body>
    </html>
    `;
    res.send(loadingHTML);
});

app.get('/download', async (req, res) => {
    req.setTimeout(0); 

    const videoURL = req.query.url;
    let requestedQuality = req.query.quality || '1080p';

    if (!videoURL) return res.status(400).send('Invalid YouTube URL');

    console.log(`\nStarting download for: ${videoURL} | Requested Quality: ${requestedQuality}`);

    let tempFilePath = '';
    let finalDownloadName = '';

    try {
        const info = await youtubedl(videoURL, { dumpJson: true, noWarnings: true });
        const cleanTitle = info.title.replace(/[^\w\s]/gi, ''); 

        let formatCode = 'bestvideo+bestaudio/best'; 
        let outputExt = 'mp4';

        if (requestedQuality === '1080p') {
            formatCode = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        } else if (requestedQuality === '720p') {
            formatCode = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        } else if (requestedQuality === '480p') {
            formatCode = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        } else if (requestedQuality === 'audio') {
            formatCode = 'bestaudio[ext=m4a]/bestaudio'; 
            outputExt = 'm4a'; 
        }

        tempFilePath = path.join(__dirname, `temp_${Date.now()}.${outputExt}`);
        finalDownloadName = `${cleanTitle}.${outputExt}`;

        console.log("Downloading.... Please wait...");

        const dlOptions = {
            format: formatCode,
            output: tempFilePath,
            ffmpegLocation: ffmpegPath, 
        };

        if (outputExt === 'mp4') {
            dlOptions.mergeOutputFormat = 'mp4'; 
        } else {
            dlOptions.extractAudio = true;       
            dlOptions.audioFormat = 'm4a'; 
        }

        await youtubedl.exec(videoURL, dlOptions);

        console.log(`Merge complete! Sending file to Browser...`);
        
        res.download(tempFilePath, finalDownloadName, (err) => {
            if (err) console.error("\n[Network Error]:", err.message);
            else console.log("\n[Success]");
            
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        });

    } catch (error) {
        console.error("\n[Error]", error.message);
        if (!res.headersSent) res.status(500).send('Error downloading video.');
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch(e) {}
        }
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
