/**
 * Project Card Component
 * Logo-based grid card with hover info effect
 * Supports single or multiple logos
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/types";
import { staggerItem, easings } from "@/lib/animations";
import { hardwareService } from "@/lib/hardware-service";
import { getMediaUrl } from "@/lib/media-utils";
import { useLanguage, getLocalizedProject, getLocalizedStatus, getLocalizedClass, isProjectUnderConstruction } from "@/lib/i18n";
import { GalleryCard } from "@/lib/data/gallery-config";

export interface ProjectCardProps {
  project?: Project;
  galleryCard?: GalleryCard;
  projects?: Project[];
  theme?: "light" | "dark";
  onClick?: (project: Project) => void;
  index?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  galleryCard,
  projects = [],
  theme = "dark",
  onClick,
  index = 0,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isDark = theme === "dark";
  const { language, t } = useLanguage();

  // Support both single project and multi-project cards
  const allProjects = projects.length > 0 ? projects : (project ? [project] : []);
  const mainProject = allProjects[0];
  const isMultiLogo = allProjects.length > 1;

  if (!mainProject) return null;

  // Get localized data for main project
  const localizedProject = getLocalizedProject(mainProject.id, language);
  const localizedStatus = getLocalizedStatus(mainProject.status, language);
  const localizedClass = getLocalizedClass(mainProject.info.class, language);
  const isBuilding = isProjectUnderConstruction(mainProject.status);

  // Get logos
  const logos = allProjects.map(p => getMediaUrl(p.logo || p.image));

  const handleClick = () => {
    if (onClick && mainProject) {
      onClick(mainProject);
    }
  };

  return (
    <motion.div
      className="group relative cursor-pointer h-full"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        scale: 1.05,
        y: -8,
        transition: {
          duration: 0.3,
          ease: "easeOut",
        },
      }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => {
        setIsHovered(true);
        hardwareService.setProjectLighting(mainProject.id, true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
      }}
      onClick={handleClick}
    >
      {/* Card Container */}
      <div className={cn(
        "relative w-full h-full overflow-hidden rounded-xl transition-all duration-300 flex items-center justify-center",
        isDark
          ? "bg-gray-900/50 border border-gray-800 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
          : "bg-white border border-gray-200 hover:border-primary hover:shadow-xl"
      )}>

        {/* Logo Container - Centered */}
        <div className={cn(
          "flex items-center justify-center w-full h-full",
          isMultiLogo ? "gap-3 p-3" : "p-4"
        )}>
          {isMultiLogo ? (
            // Multiple logos layout
            <div className={cn(
              "flex items-center justify-center gap-2 w-full h-full",
              allProjects.length === 2 ? "flex-row" : "flex-wrap"
            )}>
              {logos.map((logo, i) => (
                <motion.img
                  key={i}
                  src={logo}
                  alt={allProjects[i]?.name || ""}
                  className={cn(
                    "object-contain",
                    allProjects.length === 2 ? "w-[35%] h-[35%]" : "w-[28%] h-[28%]"
                  )}
                  animate={{
                    scale: isHovered ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.05 }}
                />
              ))}
            </div>
          ) : (
            // Single logo
            <motion.img
              src={logos[0]}
              alt={mainProject.name}
              className="w-[55%] h-[40%] object-contain"
              animate={{
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          )}
        </div>

        {/* Hover Overlay with Info */}
        <motion.div
          className={cn(
            "absolute inset-0 flex flex-col justify-end p-3",
            isDark
              ? "bg-gradient-to-t from-black/90 via-black/50 to-transparent"
              : "bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg",
              isBuilding
                ? "bg-amber-500 text-white"
                : "bg-emerald-500 text-white"
            )}>
              {isMultiLogo ? (allProjects.length + " " + t("projectsShort")) : localizedStatus}
            </span>
          </div>

          {/* Project Info */}
          <div className="space-y-0.5">
            <h3 className="text-white text-sm font-bold tracking-tight line-clamp-1">
              {galleryCard?.name || mainProject.name}
            </h3>

            {(galleryCard?.title || localizedProject?.title || mainProject.title || mainProject.subtitle) && (
              <p className="text-white/70 text-xs line-clamp-1">
                {galleryCard?.title || localizedProject?.title || mainProject.title || mainProject.subtitle}
              </p>
            )}

            {/* Quick Stats */}
            {!isMultiLogo && (
              <div className="flex items-center gap-2 pt-0.5 text-white/60 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {localizedClass}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {mainProject.info.floors} {t("floorsShort")}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Subtle border glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: isDark
              ? "inset 0 0 0 2px rgba(200, 161, 97, 0.5)"
              : "inset 0 0 0 2px rgba(139, 102, 49, 0.5)"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
};
