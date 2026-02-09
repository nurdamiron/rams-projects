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
import { easings, fadeInUp, staggerContainer } from "@/lib/animations";

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
  onInfoOpen,
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
  const [isVideoFullscreen, setIsVideoFullscreen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = React.useRef<HTMLVideoElement>(null);

  // Check if project has video
  const videoScene = project.scenes.find(s => s.video);
  const hasVideo = !!videoScene;

  // Navigation
  const goToPrevScene = () => {
    setActiveSceneIndex((prev) => (prev > 0 ? prev - 1 : allScenes.length - 1));
  };

  const goToNextScene = () => {
    setActiveSceneIndex((prev) => (prev < allScenes.length - 1 ? prev + 1 : 0));
  };

  // Auto slideshow (5 seconds interval)
  React.useEffect(() => {
    if (allScenes.length <= 1 || isVideoFullscreen) return;
    const timer = setInterval(() => {
      setActiveSceneIndex((prev) => (prev < allScenes.length - 1 ? prev + 1 : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, [allScenes.length, isVideoFullscreen]);

  // Initialize hardware — raise block on project select, lower on exit
  React.useEffect(() => {
    hardwareService.selectProject(project.id);
    return () => {
      hardwareService.deselectProject(project.id);
    };
  }, [project.id]);

  const logoSource = getMediaUrl(project.logo || project.image);
  const imageSource = getMediaUrl(activeScene.image || project.heroImage || project.image);
    const globalLogoSrc = "https://rams-global.com/assets/images/logo.webp";

    return (
      <motion.div
        className="h-screen w-full flex bg-white overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: easings.smooth }}
      >
        {/* LEFT SIDE - Logo + Info */}
        <motion.div
          className="w-1/2 flex flex-col border-r border-gray-200 bg-white relative z-20 shadow-2xl"
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
        {/* Header with Back Button */}
        <motion.div
          className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-gray-100 transition-all hover:scale-110 active:scale-90"
          >
            <Icon name="arrow_back" className="text-gray-600" />
          </Button>
          <span className="ml-3 text-gray-400 text-xs font-semibold uppercase tracking-widest">{t("backToProjects")}</span>
          
            <div className="flex-1 flex justify-end items-center gap-4 pr-6">
              <img src={globalLogoSrc} alt="RAMS" className="h-8 w-auto grayscale opacity-70 hover:opacity-100 transition-opacity" />
            </div>
        </motion.div>

        {/* Content wrapper with staggered reveal */}
        <motion.div 
          className="flex-1 flex flex-col overflow-hidden"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Logo Section */}
          <motion.div 
            className="h-[35%] flex items-center justify-center p-8 bg-gray-50/50"
            variants={fadeInUp}
          >
            <motion.div
              className="w-56 h-56 rounded-3xl bg-white border border-gray-100 flex items-center justify-center p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
              whileHover={{ y: -5, boxShadow: "0 30px 60px rgba(0,0,0,0.12)" }}
              transition={{ duration: 0.4, ease: easings.smooth }}
            >
              <motion.img
                layoutId={`project-logo-${project.id}`}
                src={logoSource}
                alt={project.name}
                className="w-full h-full object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: easings.smooth }}
              />
            </motion.div>
          </motion.div>

          {/* Info Section */}
          <div className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar">
            {/* Project Name & Title */}
            <motion.div variants={fadeInUp} className="space-y-2">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                {project.name}
              </h1>
              {(localizedProject?.title || project.title) && (
                <p className="text-xl text-primary font-bold tracking-tight">
                  {localizedProject?.title || project.title}
                </p>
              )}
            </motion.div>

            {/* Status Badge */}
            <motion.div variants={fadeInUp}>
              <span className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-block shadow-sm",
                project.status === "Сдан" || project.status.includes("Завершен")
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              )}>
                {localizedStatus}
              </span>
            </motion.div>

            {/* Quick Stats Grid */}
            <motion.div
              className="grid grid-cols-2 gap-4"
              variants={fadeInUp}
            >
              {[
                { label: t("class"), value: localizedClass, icon: "stars" },
                { label: t("floors"), value: project.info.floors, icon: "layers" },
                ...(project.info.units > 0 ? [{ label: t("apartments"), value: project.info.units, icon: "apartment" }] : []),
                { label: t("ceilingHeight"), value: project.info.ceilingHeight, icon: "straighten" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 transition-all duration-300"
                  whileHover={{ 
                    scale: 1.02, 
                    backgroundColor: "#fff",
                    borderColor: "rgba(200, 161, 97, 0.3)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={stat.icon} size="sm" className="text-primary/60" />
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="text-base font-bold text-gray-900">{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeInUp}>
              <p className="text-base text-gray-500 leading-relaxed font-medium">
                {localizedProject?.description || project.description}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

        {/* RIGHT SIDE - Gallery */}
        <motion.div
          className="w-1/2 flex flex-col relative bg-gray-100"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
        {/* Main Image/Video */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
              transition={{ duration: 0.8, ease: easings.smooth }}
            >
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] ease-linear transform hover:scale-110"
                style={{ backgroundImage: `url('${imageSource}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Video Button */}
          {hasVideo && (
            <motion.button
              onClick={() => setIsVideoFullscreen(true)}
              className="absolute bottom-10 left-10 px-10 py-5 bg-primary text-white rounded-full font-black text-xl flex items-center gap-4 shadow-[0_20px_50px_rgba(200,161,97,0.4)] group overflow-hidden"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Animated background reflection */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                animate={{ x: ['100%', '-100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <span className="relative flex items-center gap-4">
                <Icon name="play_circle" className="!text-3xl" />
                <span className="uppercase tracking-widest">{t("video")}</span>
              </span>
            </motion.button>
          )}

          {/* Navigation Arrows */}
          {allScenes.length > 1 && (
            <>
              <motion.button
                onClick={goToPrevScene}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="chevron_left" className="!text-4xl" />
              </motion.button>
              <motion.button
                onClick={goToNextScene}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="chevron_right" className="!text-4xl" />
              </motion.button>
            </>
          )}

          {/* Navigation Dots Overlay */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
            {allScenes.map((_, index) => {
              const isActive = index === activeSceneIndex;
              return (
                <motion.button
                  key={index}
                  onClick={() => setActiveSceneIndex(index)}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-500 border border-white/20",
                    isActive 
                      ? "bg-primary w-12 shadow-[0_0_15px_rgba(200,161,97,0.8)]" 
                      : "bg-white/40 hover:bg-white/60"
                  )}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                />
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Video Overlay */}
      <AnimatePresence>
        {isVideoFullscreen && videoScene && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: easings.smooth }}
          >
            <motion.button
              onClick={() => setIsVideoFullscreen(false)}
              className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white z-10"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon name="close" size="xl" />
            </motion.button>
            <video
              ref={fullscreenVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              controls
              playsInline
              src={getMediaUrl(videoScene.video)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
