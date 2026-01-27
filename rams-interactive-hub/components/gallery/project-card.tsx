/**
 * Project Card Component
 * Individual project card for the gallery/main menu
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/types";
import { staggerItem, easings } from "@/lib/animations";
import { hardwareService } from "@/lib/hardware-service";
import { getMediaUrl } from "@/lib/media-utils";
import { useLanguage, getLocalizedProject, getLocalizedStatus, getLocalizedClass } from "@/lib/i18n";

export interface ProjectCardProps {
  project: Project;
  theme?: "light" | "dark";
  onClick?: (project: Project) => void;
  index?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  theme = "dark",
  onClick,
  index = 0,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const isDark = theme === "dark";
  const logoSource = getMediaUrl(project.logo || project.image);
  const { language } = useLanguage();

  // Get localized project data
  const localizedProject = getLocalizedProject(project.id, language);
  const localizedStatus = getLocalizedStatus(project.status, language);
  const localizedClass = getLocalizedClass(project.info.class, language);

  // Localized labels for stats
  const floorsLabel: Record<string, string> = { ru: "эт.", kk: "қаб.", tr: "kat", en: "fl." };
  const unitsLabel: Record<string, string> = { ru: "кв.", kk: "пәт.", tr: "dai.", en: "apt." };

  // Check if project has only video (no real images)
  const hasOnlyVideo = project.image?.includes("placeholder") &&
    project.scenes.some(s => s.video);
  const videoScene = project.scenes.find(s => s.video);
  // Add #t=0.1 to show first frame immediately
  const videoSource = videoScene ? getMediaUrl(videoScene.video) + "#t=0.1" : null;

  // Ensure video plays and shows first frame
  React.useEffect(() => {
    if (hasOnlyVideo && videoRef.current) {
      const video = videoRef.current;
      // Always try to play to show content (muted allows autoplay)
      video.play().catch(() => {
        // If autoplay fails, at least show first frame
        video.currentTime = 0.1;
      });
    }
  }, [hasOnlyVideo]);

  // Status color
  const isBuilding = project.status === "Строится" || project.status.includes("очередь");

  return (
    <motion.div
      className="group relative overflow-hidden rounded-3xl cursor-pointer"
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      transition={{
        delay: index * 0.05,
        duration: 0.5,
        ease: easings.smooth,
      }}
      whileHover={{
        y: -8,
        transition: {
          duration: 0.3,
          ease: easings.smooth,
        },
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => {
        setIsHovered(true);
        hardwareService.setProjectLighting(project.id, true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
      }}
      onClick={() => onClick?.(project)}
    >
      {/* Image Container with gradient border effect */}
      <div className="relative">
        <motion.div
          className={cn(
            "absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-br from-primary via-primary/50 to-primary"
          )}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
        />

        <div className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-3xl",
          isDark ? "bg-gray-900" : "bg-white"
        )}>
          {/* Video Preview (if only video available) */}
          {hasOnlyVideo && videoSource ? (
            <motion.div
              className="absolute inset-0 bg-black"
              animate={{
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src={videoSource}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
              />
            </motion.div>
          ) : (
            /* Static Image */
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${getMediaUrl(project.image)}')` }}
              animate={{
                scale: isHovered ? 1.1 : 1,
                filter: isHovered ? "brightness(0.9)" : "brightness(1)"
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}

          {/* Gradient Overlay - Always visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

          {/* Top Left - Status Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-md shadow-lg border",
              isBuilding
                ? "bg-amber-500/80 text-white border-amber-400/50"
                : "bg-emerald-500/80 text-white border-emerald-400/50"
            )}>
              {localizedStatus}
            </span>
          </div>

          {/* Top Right - Logo (always visible, larger) */}
          {project.logo && !project.logo.includes("placeholder") && (
            <div className="absolute top-4 right-4 w-14 h-14 rounded-xl bg-white/95 backdrop-blur-sm p-2 shadow-xl">
              <img
                src={logoSource}
                alt={project.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Bottom - Name & Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="backdrop-blur-xl bg-black/40 rounded-2xl p-4 shadow-2xl">
              {/* Project Name */}
              <h3 className="text-white text-xl font-bold tracking-tight">
                {project.name}
              </h3>

              {/* Title / Subtitle */}
              {(localizedProject?.title || project.title || project.subtitle) && (
                <p className="text-white/70 text-sm mt-0.5">
                  {localizedProject?.title || project.title || project.subtitle}
                </p>
              )}

              {/* Quick Stats on Hover */}
              <motion.div
                className="flex items-center gap-3 mt-3 text-white/60 text-xs"
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  height: isHovered ? "auto" : 0
                }}
                transition={{ duration: 0.3 }}
              >
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {localizedClass}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {project.info.floors} {floorsLabel[language]}
                </span>
                {project.info.units > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {project.info.units} {unitsLabel[language]}
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
};
