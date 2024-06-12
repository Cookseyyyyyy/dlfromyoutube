const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 4000;

const corsOptions = {
  exposedHeaders: 'Content-Disposition',
};

app.use(cors(corsOptions));

app.get('/download', async (req, res) => {
  const url = req.query.url;
  const type = req.query.type || 'video'; // 'video' or 'audio'
  console.log('Received URL:', url);
  if (!ytdl.validateURL(url)) {
    console.log('Invalid URL');
    return res.status(400).send('Invalid URL');
  }

  try {
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[<>:"\/\\|?*]+/g, '');
    console.log('Video Info:', videoTitle);

    if (type === 'video') {
      const videoId = uuidv4();
      const videoPath = path.resolve(__dirname, `${videoId}-video.mp4`);
      const audioPath = path.resolve(__dirname, `${videoId}-audio.mp4`);
      const outputPath = path.resolve(__dirname, `${videoId}-output.mp4`);

      // Download video
      const videoStream = ytdl(url, { quality: 'highestvideo' });
      const videoWriteStream = fs.createWriteStream(videoPath);
      videoStream.pipe(videoWriteStream);

      // Download audio
      const audioStream = ytdl(url, { quality: 'highestaudio' });
      const audioWriteStream = fs.createWriteStream(audioPath);
      audioStream.pipe(audioWriteStream);

      // Wait for both downloads to finish
      await new Promise((resolve, reject) => {
        videoWriteStream.on('finish', resolve);
        videoWriteStream.on('error', reject);
      });

      await new Promise((resolve, reject) => {
        audioWriteStream.on('finish', resolve);
        audioWriteStream.on('error', reject);
      });

      // Merge video and audio
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions('-c:v copy')
        .outputOptions('-c:a aac')
        .saveToFile(outputPath)
        .on('end', () => {
          res.header('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
          console.log(`Content-Disposition: attachment; filename="${videoTitle}.mp4"`);
          fs.createReadStream(outputPath).pipe(res).on('close', () => {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(audioPath);
            fs.unlinkSync(outputPath);
          });
        })
        .on('error', (error) => {
          console.error('Error merging video and audio', error);
          res.status(500).send('Error merging video and audio');
        });

    } else if (type === 'audio') {
      res.header('Content-Disposition', `attachment; filename="${videoTitle}.wav"`);
      console.log(`Content-Disposition: attachment; filename="${videoTitle}.wav"`);
      const audioStream = ytdl(url, { quality: 'highestaudio' });

      ffmpeg(audioStream)
        .audioBitrate(128)
        .toFormat('wav')
        .pipe(res, { end: true });
    }
  } catch (error) {
    console.error('Error downloading video', error);
    res.status(500).send('Error downloading video');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
