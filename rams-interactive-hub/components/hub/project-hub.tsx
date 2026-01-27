/**
 * Project Hub Component - Immersive Cinema Mode
 * Full-screen media experience with minimal UI
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project, Scene } from "@/lib/types";
import { hardwareService } from "@/lib/hardware-service";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { InfoOverlay } from "./info-overlay";
import { getMediaUrl } from "@/lib/media-utils";
import { useLanguage, getLocalizedSceneType } from "@/lib/i18n";

export interface ProjectHubProps {
  project: Project;
  theme?: "light" | "dark";
  onBack?: () => void;
  onVideoPlay?: (scene: Scene) => void;
  onInfoOpen?: () => void;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({
  project,
  theme = "dark",
  onBack,
}) => {
  const { language } = useLanguage();
  // Prioritize video scene as initial if available
  const getInitialScene = (): Scene => {
    // First check if there's an explicitly active scene
    const activeScene = project.scenes.find((s) => s.isActive);
    if (activeScene) return activeScene;

    // If project has video scenes, start with video
    const videoScene = project.scenes.find((s) => s.video);
    if (videoScene) return videoScene;

    // Otherwise first scene
    return project.scenes[0];
  };

  const [activeScene, setActiveScene] = React.useState<Scene>(getInitialScene());
  const [showInfo, setShowInfo] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isMuted, setIsMuted] = React.useState(true);
  const [volume, setVolume] = React.useState(0.7);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-play video when scene changes to video
  React.useEffect(() => {
    if (activeScene.video && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [activeScene]);

  // Initialize hardware on project change
  React.useEffect(() => {
    hardwareService.setProjectLighting(project.id, true);
    return () => {
      hardwareService.resetAll();
    };
  }, [project.id]);

  // Auto-hide controls after 3 seconds of inactivity
  React.useEffect(() => {
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const handleTouch = () => resetControlsTimeout();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchstart', handleTouch);
    resetControlsTimeout();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouch);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Auto-advance slideshow - wait for video to finish
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let videoElement: HTMLVideoElement | null = null;

    const advanceToNextScene = () => {
      // Only advance if there are multiple scenes
      if (project.scenes.length <= 1) return;

      setActiveScene((currentScene) => {
        const currentIndex = project.scenes.findIndex(s => s.id === currentScene.id);
        const nextIndex = (currentIndex + 1) % project.scenes.length;
        return project.scenes[nextIndex];
      });
    };

    const handleVideoEnd = () => {
      advanceToNextScene();
    };

    // For video scenes - wait until video ends
    if (activeScene.video) {
      // Small delay to ensure video element is mounted
      const setupVideoListener = () => {
        videoElement = videoRef.current;
        if (videoElement) {
          videoElement.addEventListener('ended', handleVideoEnd);
        }
      };

      // Try immediately and also after a small delay
      setupVideoListener();
      timeoutId = setTimeout(setupVideoListener, 100);

      return () => {
        if (videoElement) {
          videoElement.removeEventListener('ended', handleVideoEnd);
        }
        clearTimeout(timeoutId);
      };
    } else {
      // For photo scenes - advance after 6 seconds
      timeoutId = setTimeout(advanceToNextScene, 6000);
      return () => clearTimeout(timeoutId);
    }
  }, [activeScene.id, project.scenes.length]);

  const handleSceneChange = (scene: Scene) => {
    setActiveScene(scene);
    if (scene.video) setIsPlaying(true);
  };

  const handleNextScene = () => {
    const currentIndex = project.scenes.findIndex(s => s.id === activeScene.id);
    const nextIndex = (currentIndex + 1) % project.scenes.length;
    handleSceneChange(project.scenes[nextIndex]);
  };

  const handlePrevScene = () => {
    const currentIndex = project.scenes.findIndex(s => s.id === activeScene.id);
    const prevIndex = currentIndex === 0 ? project.scenes.length - 1 : currentIndex - 1;
    handleSceneChange(project.scenes[prevIndex]);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted) {
        videoRef.current.volume = volume;
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const imageSource = getMediaUrl(activeScene.image || project.heroImage || project.image);
  const videoSource = getMediaUrl(activeScene.video);
  const logoSource = getMediaUrl(project.logo || project.image);
  const currentIndex = project.scenes.findIndex(s => s.id === activeScene.id);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black">

      {/* Full-Screen Media Background */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScene.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {activeScene.video ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                playsInline
                preload="auto"
                src={videoSource}
              />
            ) : (
              <motion.div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${imageSource}')` }}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: "linear" }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* Top Left - Logo */}
      <motion.div
        className="absolute top-16 left-8 z-50 flex items-center gap-5"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: showControls ? 1 : 0, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-xl hover:bg-black/70 hover:scale-105 transition-all shadow-2xl"
        >
          <Icon name="arrow_back" size="lg" className="text-white" />
        </Button>

        {/* Logo - Large with white background */}
        <div className="w-36 h-36 rounded-3xl bg-white flex items-center justify-center p-4 shadow-2xl">
          <img
            src={logoSource}
            alt={project.name}
            className="w-full h-full object-contain"
          />
        </div>
      </motion.div>

      {/* Top Right - Controls */}
      <motion.div
        className="absolute top-8 right-8 z-50 flex items-center gap-4"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: showControls ? 1 : 0, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Scene Counter */}
        <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-white font-medium">
          {currentIndex + 1} / {project.scenes.length}
        </div>

        {/* Volume Control */}
        {activeScene.video && (
          <div className="flex items-center gap-2">
            {/* Volume Slider */}
            <div className="flex items-center gap-2 h-10 px-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/20">
              <Icon name="volume_down" size="sm" className="text-white/50" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <Icon name="volume_up" size="sm" className="text-white/50" />
            </div>

            {/* Mute/Unmute Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={cn(
                "w-10 h-10 rounded-full backdrop-blur-xl border transition-all",
                isMuted
                  ? "bg-black/40 border-white/20 hover:bg-black/60"
                  : "bg-primary/20 border-primary/50 hover:bg-primary/30"
              )}
            >
              <Icon
                name={isMuted ? "volume_off" : "volume_up"}
                size="md"
                className={isMuted ? "text-white/70" : "text-primary"}
              />
            </Button>
          </div>
        )}

        {/* Info Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInfo(true)}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 hover:bg-black/60 transition-all"
        >
          <Icon name="info" size="lg" className="text-white" />
        </Button>
      </motion.div>

      {/* Center Navigation Arrows */}
      <motion.div
        className="absolute inset-y-0 left-0 right-0 z-30 flex items-center justify-between px-8 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          onClick={handlePrevScene}
          className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 hover:bg-black/50 flex items-center justify-center transition-all shadow-2xl pointer-events-auto"
          whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.5)" }}
          whileTap={{ scale: 0.95 }}
        >
          <Icon name="chevron_left" className="text-white !text-4xl" />
        </motion.button>

        <motion.button
          onClick={handleNextScene}
          className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 hover:bg-black/50 flex items-center justify-center transition-all shadow-2xl pointer-events-auto"
          whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.5)" }}
          whileTap={{ scale: 0.95 }}
        >
          <Icon name="chevron_right" className="text-white !text-4xl" />
        </motion.button>
      </motion.div>

      {/* Bottom - Scene Thumbnails */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

        {/* Thumbnails Container */}
        <div className="relative px-8 py-6 pt-10">
          <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 pt-4 scrollbar-hide justify-center">
            {project.scenes.map((scene, index) => {
              const isActive = scene.id === activeScene.id;
              const sceneImage = getMediaUrl(scene.image);

              return (
                <motion.button
                  key={scene.id}
                  onClick={() => handleSceneChange(scene)}
                  className={cn(
                    "relative flex-shrink-0 overflow-hidden rounded-xl transition-all duration-300",
                    "h-28 w-44 border-2",
                    isActive
                      ? "border-white ring-2 ring-white/50 scale-105"
                      : "border-white/30 opacity-70 hover:opacity-100 hover:border-white/60"
                  )}
                  whileHover={{ scale: isActive ? 1.05 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Thumbnail Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url('${sceneImage}')` }}
                  />

                  {/* Overlay */}
                  <div className={cn(
                    "absolute inset-0 transition-colors duration-300",
                    isActive ? "bg-transparent" : "bg-black/40 hover:bg-black/20"
                  )} />

                  {/* Video Indicator */}
                  {scene.video && (
                    <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Icon name="play_arrow" className="text-black !text-xl ml-0.5" />
                    </div>
                  )}

                  {/* Scene Number */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                    <span className="text-white text-xs font-medium">{index + 1}</span>
                  </div>

                  {/* Scene Type Label */}
                  {scene.type && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                      <span className="text-white/80 text-xs">{getLocalizedSceneType(scene.type, language)}</span>
                    </div>
                  )}

                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 border-2 border-white rounded-xl"
                      layoutId="activeScene"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

        </div>
      </motion.div>

      {/* Info Overlay */}
      <InfoOverlay
        project={project}
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
      />
    </div>
  );
};
