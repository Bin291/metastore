"use client";

import { useState, useRef, useEffect } from "react";
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiSettings } from "react-icons/fi";
import Hls from "hls.js";

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
}

export function CustomVideoPlayer({ src, className = "" }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualities, setQualities] = useState<{ level: number; height: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if this is an HLS stream
    const isHLS = src.includes('/hls/') || src.endsWith('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for adaptive streaming
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest loaded, found ' + data.levels.length + ' quality levels');
        
        // Extract quality levels
        const levels = data.levels.map((level, index) => ({
          level: index,
          height: level.height,
          label: `${level.height}p`,
        }));
        
        setQualities(levels);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
    } else {
      // Regular video file
      video.src = src;
    }

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const vol = parseFloat(e.target.value);
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const changeQuality = (level: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (level === -1) {
      // Auto quality
      hls.currentLevel = -1;
    } else {
      hls.currentLevel = level;
    }

    setCurrentQuality(level);
    setShowQualityMenu(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        style={{ maxHeight: '80vh' }}
      />

      {/* Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer mb-3 accent-indigo-500"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / duration) * 100}%, #52525b ${(currentTime / duration) * 100}%, #52525b 100%)`
          }}
        />

        <div className="flex items-center justify-between gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              {isPlaying ? <FiPause className="h-6 w-6" /> : <FiPlay className="h-6 w-6" />}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-indigo-400 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <FiVolumeX className="h-5 w-5" />
                ) : (
                  <FiVolume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <FiSettings className="h-5 w-5" />
                  <span className="text-xs">
                    {currentQuality === -1 ? 'Auto' : qualities.find(q => q.level === currentQuality)?.label}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-zinc-900 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                    <button
                      onClick={() => changeQuality(-1)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                        currentQuality === -1 ? 'text-indigo-400 bg-zinc-800' : 'text-white'
                      }`}
                    >
                      Auto
                    </button>
                    {qualities.map((quality) => (
                      <button
                        key={quality.level}
                        onClick={() => changeQuality(quality.level)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                          currentQuality === quality.level ? 'text-indigo-400 bg-zinc-800' : 'text-white'
                        }`}
                      >
                        {quality.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              {isFullscreen ? (
                <FiMinimize className="h-5 w-5" />
              ) : (
                <FiMaximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
