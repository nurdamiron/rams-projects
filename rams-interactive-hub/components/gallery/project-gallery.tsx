/**
 * Project Gallery Component
 * Main menu / Project showcase screen with 15 cards (some multi-logo)
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";
import { getMediaUrl } from "@/lib/media-utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLanguage } from "@/lib/i18n";
import { GALLERY_CARDS, getProjectsForCard } from "@/lib/data/gallery-config";

import { staggerContainer, fadeInUp, easings } from "@/lib/animations";

export interface ProjectGalleryProps {
  projects: Project[];
  theme?: "light" | "dark";
  onProjectSelect?: (project: Project) => void;
  onAboutCompany?: () => void;
  connectionStatus?: "online" | "offline" | "warning";
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({
  projects,
  theme = "dark",
  onProjectSelect,
  onAboutCompany,
  connectionStatus = "online",
}) => {
  const isDark = theme === "dark";
  const { toggleTheme } = require("@/lib/theme-context").useTheme();
  const { t } = useLanguage();
  // Use direct path for brand assets (always available in public folder)
  const logoSrc = "/images/brand/rams-logo.png";

  return (
    <motion.div
      className={cn(
        "h-screen w-full relative overflow-hidden flex flex-col",
        isDark ? "bg-background-dark" : "bg-white"
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background Pattern */}
      {!isDark && (
        <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none" />
      )}

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with RAMS Logo - Compact */}
        <motion.header
          className="py-4 px-6 relative z-50 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center relative">
            {/* RAMS Logo centered */}
            <motion.img
              src={logoSrc}
              alt="RAMS Global"
              className="h-12 w-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />

            {/* Right side buttons - Icons only */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 z-50">
              {/* Language Switcher */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <LanguageSwitcher theme={theme} />
              </motion.div>

              {/* About Company Button - Icon */}
              <motion.button
                onClick={onAboutCompany}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isDark
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-primary-dark text-white hover:bg-primary-dark/90"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={t("aboutCompany")}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.button>

              {/* Theme Toggle Button */}
              <motion.button
                onClick={toggleTheme}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isDark
                    ? "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20"
                    : "bg-gray-900 border border-gray-800 hover:bg-gray-800"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Projects Grid - 5x3 for 15 cards */}
        <main className="px-4 md:px-8 pb-4 flex-1">
          <motion.div
            className="max-w-[1800px] mx-auto h-full"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-5 grid-rows-3 gap-4 h-full">
              {GALLERY_CARDS.map((card, index) => {
                const cardProjects = getProjectsForCard(card);
                return (
                  <ProjectCard
                    key={card.id}
                    galleryCard={card}
                    projects={cardProjects as Project[]}
                    theme={theme}
                    onClick={onProjectSelect}
                    index={index}
                  />
                );
              })}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Decorative Elements */}
      <motion.div
        className={cn(
          "fixed top-0 left-0 w-1/3 h-1/3 blur-3xl opacity-10 pointer-events-none",
          isDark
            ? "bg-gradient-to-br from-primary to-transparent"
            : "bg-gradient-to-br from-primary-dark to-transparent"
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "fixed bottom-0 right-0 w-1/3 h-1/3 blur-3xl opacity-10 pointer-events-none",
          isDark
            ? "bg-gradient-to-tl from-primary to-transparent"
            : "bg-gradient-to-tl from-primary-dark to-transparent"
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </motion.div>
  );
};
