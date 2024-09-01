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
            downloadAndConvertVideo(url);
        });
    } else if (choice.toLowerCase() === 'mp4') {
        // If user chooses local MP4 file
        rl.question('Please enter the path to the MP4 video on your local system: ', (pathToFile) => {
            if (fs.existsSync(pathToFile) && path.extname(pathToFile) === '.mp4') {
                convertVideoToAudio(pathToFile);
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

function downloadAndConvertVideo(url) {
    rl.question('Please assign a name to the output MP3 file (without extension): ', (outputName) => {
        const outputPath = `${outputName}.mp3`;
        const tempVideoPath = 'temp_video.mp4';
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

        console.log('Listing available formats...');
        exec(`yt-dlp --list-formats ${url}`, (err, stdout, stderr) => {
            if (err) {
                console.error('Error listing formats:', err.message);
                rl.close();
                return;
            }

            // Extracting format code from the output
            const formats = stdout.split('\n').filter(line => line.includes('mp4'));
            const formatLine = formats[0]; // Choose the first available format line
            if (!formatLine) {
                console.error('No suitable format found.');
                rl.close();
                return;
            }

            // Extract the format code (e.g., hls-380)
            const formatCode = formatLine.split(' ')[0].trim();

            console.log('Downloading video with format:', formatCode);
            exec(`yt-dlp -f ${formatCode} -o ${tempVideoPath} ${url}`, (err, stdout, stderr) => {
                if (err) {
                    console.error('Error during video download:', err.message);
                    rl.close();
                    return;
                }

                console.log('Converting video to audio...');
                convertVideoToAudio(tempVideoPath, outputName, outputPath);
            });
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
