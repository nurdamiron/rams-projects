/**
 * Project Hub Component - Split Layout
 * Left: Logo + Info | Right: Gallery
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project, Scene } from "@/lib/types";
import { hardwareService } from "@/lib/hardware-service";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMediaUrl } from "@/lib/media-utils";
import { useLanguage, getLocalizedProject, getLocalizedStatus, getLocalizedClass } from "@/lib/i18n";

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
  const { t, language } = useLanguage();

  // Get localized data
  const localizedProject = getLocalizedProject(project.id, language);
  const localizedStatus = getLocalizedStatus(project.status, language);
  const localizedClass = getLocalizedClass(project.info.class, language);

  // Only photo scenes for slideshow (no videos)
  const photoScenes = project.scenes.filter(s => !s.video);
  const allScenes = photoScenes.length > 0 ? photoScenes : project.scenes;

  // State
  const [activeSceneIndex, setActiveSceneIndex] = React.useState(0);
  const activeScene = allScenes[activeSceneIndex];
  const [isMuted, setIsMuted] = React.useState(true);
  const [volume, setVolume] = React.useState(0.5);
  const [isVideoFullscreen, setIsVideoFullscreen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = React.useRef<HTMLVideoElement>(null);

  // Check if project has video (check original scenes, not filtered)
  const videoScene = project.scenes.find(s => s.video);
  const hasVideo = !!videoScene;

  // Navigation
  const goToPrevScene = () => {
    setActiveSceneIndex((prev) => (prev > 0 ? prev - 1 : allScenes.length - 1));
  };

  const goToNextScene = () => {
    setActiveSceneIndex((prev) => (prev < allScenes.length - 1 ? prev + 1 : 0));
  };

  // Auto-play video when scene changes
  React.useEffect(() => {
    if (activeScene.video && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [activeScene]);

  // Initialize hardware
  React.useEffect(() => {
    hardwareService.setProjectLighting(project.id, true);
    return () => {
      hardwareService.resetAll();
    };
  }, [project.id]);

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const logoSource = getMediaUrl(project.logo || project.image);
  const imageSource = getMediaUrl(activeScene.image || project.heroImage || project.image);
  const videoSource = getMediaUrl(activeScene.video);

  return (
    <motion.div
      className="h-screen w-full flex bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >

      {/* LEFT SIDE - Logo + Info */}
      <motion.div
        className="w-[40%] flex flex-col border-r border-gray-200"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >

        {/* Header with Back Button */}
        <motion.div
          className="h-16 flex items-center px-6 border-b border-gray-100"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-gray-100 transition-all hover:scale-110"
          >
            <Icon name="arrow_back" className="text-gray-600" />
          </Button>
          <span className="ml-3 text-gray-500 text-sm">{t("backToProjects")}</span>
        </motion.div>

        {/* Logo Section */}
        <div className="h-[35%] flex items-center justify-center p-6 bg-gray-50">
          <motion.div
            className="w-48 h-48 rounded-2xl bg-white border border-gray-200 flex items-center justify-center p-6 shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.img
              src={logoSource}
              alt={project.name}
              className="w-full h-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            />
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="flex-1 p-6 bg-white border-t border-gray-100 overflow-y-auto">
          {/* Project Name & Title */}
          <motion.div
            className="mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {(localizedProject?.title || project.title) && (
              <p className="text-lg text-primary font-medium">
                {localizedProject?.title || project.title}
              </p>
            )}
          </motion.div>

          {/* Status Badge */}
          <motion.div
            className="mb-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, type: "spring" }}
          >
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-semibold inline-block",
              project.status === "Сдан" || project.status.includes("Завершен")
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}>
              {localizedStatus}
            </span>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-2 gap-3 mb-4"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {[
              { label: t("class"), value: localizedClass },
              { label: t("floors"), value: project.info.floors },
              ...(project.info.units > 0 ? [{ label: t("apartments"), value: project.info.units }] : []),
              { label: t("ceilingHeight"), value: project.info.ceilingHeight },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-gray-50 rounded-lg p-3"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, backgroundColor: "#f3f4f6" }}
              >
                <p className="text-xs text-gray-500 uppercase">{stat.label}</p>
                <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Description */}
          <motion.p
            className="text-sm text-gray-600"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            {localizedProject?.description || project.description}
          </motion.p>
        </div>
      </motion.div>

      {/* RIGHT SIDE - Gallery */}
      <motion.div
        className="w-[60%] flex flex-col"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >

        {/* Main Image/Video */}
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${imageSource}')` }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Video Button - Always visible if project has video */}
          {hasVideo && (
            <motion.button
              onClick={() => setIsVideoFullscreen(true)}
              className="absolute bottom-6 left-6 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl group"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/30" style={{ animationDuration: '2s' }} />
              <span className="relative flex items-center gap-3">
                <Icon name="play_circle" className="!text-3xl" />
                {t("video")}
              </span>
            </motion.button>
          )}

          {/* Navigation Arrows */}
          {allScenes.length > 1 && (
            <>
              <motion.button
                onClick={goToPrevScene}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.7)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="chevron_left" className="text-white !text-3xl" />
              </motion.button>
              <motion.button
                onClick={goToNextScene}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.7)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="chevron_right" className="text-white !text-3xl" />
              </motion.button>
            </>
          )}
        </div>

        {/* Dots Navigation */}
        <motion.div
          className="h-16 bg-white border-t border-gray-200 flex items-center justify-center gap-3"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {allScenes.map((scene, index) => {
            const isActive = index === activeSceneIndex;
            return (
              <motion.button
                key={scene.id}
                onClick={() => setActiveSceneIndex(index)}
                className={cn(
                  "rounded-full transition-colors",
                  isActive
                    ? "bg-primary"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                animate={{
                  scale: isActive ? 1.3 : 1,
                  width: isActive ? 24 : 12,
                  height: 12,
                }}
                transition={{ duration: 0.3, type: "spring" }}
                whileHover={{ scale: isActive ? 1.3 : 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            );
          })}
        </motion.div>
      </motion.div>

      {/* Fullscreen Video Overlay */}
      <AnimatePresence>
        {isVideoFullscreen && videoScene && (
          <motion.div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsVideoFullscreen(false)}
          >
            {/* Video */}
            <video
              ref={fullscreenVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              controls
              playsInline
              src={getMediaUrl(videoScene.video)}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
