"use client";

import { useState, useRef, useEffect } from "react";
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMusic } from "react-icons/fi";

interface CustomAudioPlayerProps {
  src: string;
  filename: string;
  className?: string;
}

export function CustomAudioPlayer({ src, filename, className = "" }: CustomAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg p-6 ${className}`}>
      <audio ref={audioRef} src={src} />

      {/* Album Art / Icon */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-2xl">
          <FiMusic className="h-24 w-24 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white text-center">{filename}</h3>
        <p className="text-sm text-zinc-400 mt-1">Audio File</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / duration) * 100}%, #3f3f46 ${(currentTime / duration) * 100}%, #3f3f46 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Volume */}
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
            className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow-lg hover:shadow-indigo-500/50"
        >
          {isPlaying ? <FiPause className="h-7 w-7" /> : <FiPlay className="h-7 w-7 ml-1" />}
        </button>

        {/* Spacer for symmetry */}
        <div className="w-32"></div>
      </div>
    </div>
  );
}
