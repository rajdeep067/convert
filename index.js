const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const cliProgress = require('cli-progress');
const path = require('path');

// Set up readline for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask user to choose between URL or local MP4 file
rl.question('Would you like to use a video URL or a local MP4 file? (Enter "url" or "mp4"): ', (choice) => {
    if (choice.toLowerCase() === 'url') {
        // If user chooses URL
        rl.question('Please enter the video URL: ', (url) => {
            listAndSelectVideo(url);
        });
    } else if (choice.toLowerCase() === 'mp4') {
        // If user chooses local MP4 file
        rl.question('Please enter the path to the MP4 video on your local system: ', (pathToFile) => {
            if (fs.existsSync(pathToFile) && path.extname(pathToFile) === '.mp4') {
                rl.question('Please assign a name to the output MP3 file (without extension): ', (outputName) => {
                    convertVideoToAudio(pathToFile, outputName);
                });
            } else {
                console.log('Invalid file path. Please ensure the file exists and is an MP4.');
                rl.close();
            }
        });
    } else {
        console.log('Invalid choice. Please enter "url" or "mp4".');
        rl.close();
    }
});

function listAndSelectVideo(url) {
    console.log('Fetching video details...');
    exec(`yt-dlp -F ${url}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error fetching video details:', err.message);
            rl.close();
            return;
        }

        // Extract video formats and sizes
        const lines = stdout.split('\n');
        const videos = lines.filter(line => line.includes('mp4') || line.includes('webm'));
        if (videos.length === 0) {
            console.log('No video formats found.');
            rl.close();
            return;
        }

        // Display video options
        console.log('Available videos:');
        videos.forEach((line, index) => {
            console.log(`${index + 1}: ${line}`);
        });

        // Ask user to select a video
        rl.question('Enter the number of the video you want to download: ', (choice) => {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < videos.length) {
                const selectedFormat = videos[index].split(' ')[0].trim();
                downloadAndConvertVideo(url, selectedFormat);
            } else {
                console.log('Invalid choice.');
                rl.close();
            }
        });
    });
}

function downloadAndConvertVideo(url, format) {
    rl.question('Please assign a name to the output MP3 file (without extension): ', (outputName) => {
        const outputPath = `${outputName}.mp3`;
        const tempVideoPath = 'temp_video.mp4';
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

        console.log('Downloading video with format:', format);
        exec(`yt-dlp -f ${format} -o ${tempVideoPath} ${url}`, (err, stdout, stderr) => {
            if (err) {
                console.error('Error during video download:', err.message);
                rl.close();
                return;
            }

            console.log('Converting video to audio...');
            convertVideoToAudio(tempVideoPath, outputName);
        });
    });
}

function convertVideoToAudio(inputPath, outputName = 'output', outputPath = `${outputName}.mp3`) {
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    ffmpeg(inputPath)
        .audioBitrate(320)
        .on('progress', progress => {
            progressBar.start(100, progress.percent || 0);
        })
        .on('end', () => {
            progressBar.stop();
            console.log(`Audio conversion completed. Saved as: ${outputPath}`);
            console.log(`File saved at: ${process.cwd()}/${outputPath}`);
            fs.unlinkSync(inputPath); // Remove temporary video file
            rl.close();
        })
        .on('error', err => {
            console.error('Error during conversion:', err.message);
            rl.close();
        })
        .save(outputPath);
}
