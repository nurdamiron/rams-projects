/**
 * Project Gallery Component
 * Main menu / Project showcase screen
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/types";
import { ProjectCard } from "./project-card";
import { Button } from "@/components/ui/button";
import { getMediaUrl } from "@/lib/media-utils";

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
  // Use direct path for brand assets (always available in public folder)
  const logoSrc = "/images/brand/rams-logo.png";

  return (
    <div
      className={cn(
        "min-h-screen w-full relative overflow-hidden",
        isDark ? "bg-background-dark" : "bg-white"
      )}
    >
      {/* Background Pattern */}
      {!isDark && (
        <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none" />
      )}

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header with RAMS Logo */}
        <motion.header
          className="pt-8 pb-12 px-6 relative z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center relative">
            {/* RAMS Logo centered */}
            <motion.img
              src={logoSrc}
              alt="RAMS Global"
              className="w-[300px] h-auto mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />

            {/* Right side buttons */}
            <div className="absolute right-0 top-0 flex items-center gap-3 z-50">
              {/* About Company Button */}
              <motion.button
                onClick={onAboutCompany}
                className={cn(
                  "px-6 py-3 rounded-full font-semibold tracking-wider transition-all shadow-lg",
                  isDark
                    ? "bg-primary text-white hover:bg-primary/90 border-2 border-primary hover:shadow-primary/50"
                    : "bg-primary-dark text-white hover:bg-primary-dark/90 border-2 border-primary-dark hover:shadow-primary-dark/50"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                О КОМПАНИИ
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
                whileHover={{ scale: 1.05, rotate: 180 }}
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

        {/* Projects Grid */}
        <main className="px-6 md:px-12 pb-24">
          <motion.div
            className="max-w-[1600px] mx-auto"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  theme={theme}
                  onClick={onProjectSelect}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </main>

      </div>

      {/* Decorative Elements */}
      <div
        className={cn(
          "fixed top-0 left-0 w-1/3 h-1/3 blur-3xl opacity-10 pointer-events-none",
          isDark
            ? "bg-gradient-to-br from-primary to-transparent"
            : "bg-gradient-to-br from-primary-dark to-transparent"
        )}
      />
      <div
        className={cn(
          "fixed bottom-0 right-0 w-1/3 h-1/3 blur-3xl opacity-10 pointer-events-none",
          isDark
            ? "bg-gradient-to-tl from-primary to-transparent"
            : "bg-gradient-to-tl from-primary-dark to-transparent"
        )}
      />
    </div>
  );
};
