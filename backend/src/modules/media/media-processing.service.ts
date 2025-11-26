import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

// Set ffmpeg and ffprobe paths
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath?.path) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

export interface MediaProcessingResult {
  masterPlaylistPath: string;
  qualities: {
    resolution: string;
    playlistPath: string;
    bandwidth: number;
  }[];
  duration: number;
}

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  /**
   * Process video file into HLS format with multiple quality variants
   */
  async processVideo(
    inputPath: string,
    outputDir: string,
    fileName: string,
  ): Promise<MediaProcessingResult> {
    this.logger.log(`Processing video: ${fileName}`);

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Quality variants configuration
    const qualities = [
      { name: '1080p', resolution: '1920x1080', videoBitrate: '5000k', audioBitrate: '192k', bandwidth: 5000000 },
      { name: '720p', resolution: '1280x720', videoBitrate: '2800k', audioBitrate: '128k', bandwidth: 2800000 },
      { name: '480p', resolution: '854x480', videoBitrate: '1400k', audioBitrate: '128k', bandwidth: 1400000 },
      { name: '360p', resolution: '640x360', videoBitrate: '800k', audioBitrate: '96k', bandwidth: 800000 },
    ];

    const results: MediaProcessingResult['qualities'] = [];
    let videoDuration = 0;

    // Get video duration first
    videoDuration = await this.getVideoDuration(inputPath);

    // Process each quality variant
    for (const quality of qualities) {
      const qualityDir = path.join(outputDir, quality.name);
      await mkdir(qualityDir, { recursive: true });

      const playlistName = `${quality.name}.m3u8`;
      const playlistPath = path.join(qualityDir, playlistName);
      const segmentPattern = path.join(qualityDir, 'segment_%03d.ts');

      try {
        await this.transcodeToHLS(
          inputPath,
          playlistPath,
          segmentPattern,
          quality.resolution,
          quality.videoBitrate,
          quality.audioBitrate,
        );

        results.push({
          resolution: quality.name,
          playlistPath: `${quality.name}/${playlistName}`,
          bandwidth: quality.bandwidth,
        });

        this.logger.log(`Generated ${quality.name} variant`);
      } catch (error) {
        this.logger.warn(`Failed to generate ${quality.name} variant: ${error.message}`);
        // Continue with other qualities
      }
    }

    // Create master playlist
    const masterPlaylistContent = this.generateMasterPlaylist(results);
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    await writeFile(masterPlaylistPath, masterPlaylistContent);

    this.logger.log(`Video processing completed: ${fileName}`);

    return {
      masterPlaylistPath: 'master.m3u8',
      qualities: results,
      duration: videoDuration,
    };
  }

  /**
   * Process audio file into HLS format
   */
  async processAudio(
    inputPath: string,
    outputDir: string,
    fileName: string,
  ): Promise<MediaProcessingResult> {
    this.logger.log(`Processing audio: ${fileName}`);

    await mkdir(outputDir, { recursive: true });

    const playlistPath = path.join(outputDir, 'audio.m3u8');
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts');

    // Get audio duration
    const duration = await this.getVideoDuration(inputPath);

    // Transcode to HLS
    await this.transcodeToHLS(
      inputPath,
      playlistPath,
      segmentPattern,
      null, // No video
      null,
      '192k', // Audio bitrate
    );

    return {
      masterPlaylistPath: 'audio.m3u8',
      qualities: [{
        resolution: 'audio',
        playlistPath: 'audio.m3u8',
        bandwidth: 192000,
      }],
      duration,
    };
  }

  /**
   * Transcode media to HLS format
   */
  private transcodeToHLS(
    inputPath: string,
    playlistPath: string,
    segmentPattern: string,
    resolution: string | null,
    videoBitrate: string | null,
    audioBitrate: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Add video encoding if resolution specified
      if (resolution && videoBitrate) {
        command = command
          .size(resolution)
          .videoBitrate(videoBitrate)
          .videoCodec('libx264')
          .outputOptions([
            '-preset fast',
            '-profile:v main',
            '-level 4.0',
            '-crf 23',
            '-sc_threshold 0', // Disable scene change detection for consistent segments
            '-g 48', // GOP size (keyframe every 2 seconds at 24fps)
            '-keyint_min 48',
          ]);
      } else {
        // Audio-only, no video
        command = command.noVideo();
      }

      // Add audio encoding
      command = command
        .audioBitrate(audioBitrate)
        .audioCodec('aac')
        .audioChannels(2)
        .audioFrequency(44100);

      // HLS-specific options
      command = command.outputOptions([
        '-start_number 0',
        '-hls_time 6', // 6 second segments for fast streaming
        '-hls_list_size 0', // Include all segments in playlist
        '-hls_segment_type mpegts', // Use MPEG-TS container
        '-hls_segment_filename', segmentPattern,
        '-f hls',
      ]);

      command
        .output(playlistPath)
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.debug(`Processing: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          this.logger.log(`HLS transcoding completed: ${path.basename(playlistPath)}`);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get video/audio duration
   */
  private getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  /**
   * Generate master playlist for HLS
   */
  private generateMasterPlaylist(
    qualities: MediaProcessingResult['qualities'],
  ): string {
    let content = '#EXTM3U\n';
    content += '#EXT-X-VERSION:3\n\n';

    for (const quality of qualities) {
      const resolution = quality.resolution === 'audio' 
        ? '' 
        : `,RESOLUTION=${quality.resolution.replace('p', '').split('x').reverse().join('x')}`;
      
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth}${resolution}\n`;
      content += `${quality.playlistPath}\n`;
    }

    return content;
  }

  /**
   * Clean up processed media files
   */
  async cleanupMedia(outputDir: string): Promise<void> {
    try {
      const files = await readdir(outputDir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(outputDir, file.name);
        if (file.isDirectory()) {
          await this.cleanupMedia(fullPath);
          await fs.promises.rmdir(fullPath);
        } else {
          await unlink(fullPath);
        }
      }
      
      this.logger.log(`Cleaned up media directory: ${outputDir}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup media: ${error.message}`);
    }
  }
}
