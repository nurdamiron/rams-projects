/**
 * RAMS Interactive Hub - Main Application
 * Premium real estate presentation system
 */

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Screensaver } from "@/components/screensaver";
import { ProjectGallery } from "@/components/gallery";
import { ProjectHub } from "@/components/hub/project-hub";
import { FullscreenVideo } from "@/components/video-player/fullscreen-video";
import { InfoModal } from "@/components/modals/info-modal";
import { AboutCompany } from "@/components/modals/about-company";
import { AdminModal } from "@/components/modals/admin-modal";
import { ActuatorControl } from "@/components/actuator-control";
import { RAMS_PROJECTS } from "@/lib/data/projects";
import { Project, Scene } from "@/lib/types";
import { useTheme } from "@/lib/theme-context";
import { useProjectSync } from "@/lib/use-project-sync";

type AppScreen = "gallery" | "hub";

export default function Home() {
  const { theme } = useTheme();

  // App State - start directly on gallery
  const [currentScreen, setCurrentScreen] = React.useState<AppScreen>("gallery");
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [selectedProjects, setSelectedProjects] = React.useState<Project[]>([]);
  const [isVideoOpen, setIsVideoOpen] = React.useState(false);
  const [activeVideoScene, setActiveVideoScene] = React.useState<Scene | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);
  const [isAboutCompanyOpen, setIsAboutCompanyOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const [isActuatorControlOpen, setIsActuatorControlOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>(RAMS_PROJECTS);
  const [visibleProjects, setVisibleProjects] = React.useState<Project[]>(RAMS_PROJECTS);

  // Project Sync Hook (актуаторы + LED) - ПОСЛЕ инициализации visibleProjects
  const projectSync = useProjectSync({
    projects: visibleProjects,  // Передаем список проектов для определения индекса
    enableActuators: true,
    enableLED: true,
    animationDuration: 5000,  // 5 сек подъем
    fadeInDuration: 3000,     // 3 сек плавное свечение
  });

  // Load external projects if available
  React.useEffect(() => {
    const loadProjects = async () => {
      if (typeof window !== 'undefined' && (window as any).electron) {
        try {
          const externalProjects = await (window as any).electron.getProjectsData();
          if (externalProjects && externalProjects.length > 0) {
            console.log('[App] Loaded external projects:', externalProjects.length);
            setProjects(externalProjects);
          }
        } catch (error) {
          console.error('[App] Failed to load external projects:', error);
        }
      }
    };

    loadProjects();
  }, []);

  // Filter projects based on visibility settings from localStorage
  const loadVisibilitySettings = React.useCallback(() => {
    const savedVisibility = localStorage.getItem("rams-project-visibility");
    if (savedVisibility) {
      const visibility = JSON.parse(savedVisibility) as Record<string, boolean>;
      const filtered = projects.filter((p) => visibility[p.id] !== false);
      setVisibleProjects(filtered);
    } else {
      setVisibleProjects(projects);
    }
  }, [projects]);

  React.useEffect(() => {
    loadVisibilitySettings();

    // Reload settings when returning from admin page
    const handleFocus = () => loadVisibilitySettings();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadVisibilitySettings]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A - Admin modal
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsAdminOpen(true);
      }
      // Ctrl+Shift+C - Actuator Control
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setIsActuatorControlOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Listen for Electron IPC event (in kiosk mode)
    if (typeof window !== 'undefined' && (window as any).electron?.onOpenAdmin) {
      (window as any).electron.onOpenAdmin(() => {
        console.log('[App] Received open-admin from Electron');
        setIsAdminOpen(true);
      });
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Idle screensaver configuration (5 minutes = 300000ms)
  const IDLE_SCREENSAVER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Project selection from gallery - supports both single project and multiple projects
  const handleProjectSelect = async (projectOrProjects: Project | Project[]) => {
    const projects = Array.isArray(projectOrProjects) ? projectOrProjects : [projectOrProjects];
    const mainProject = projects[0];

    console.log(`[App] ========== PROJECT SELECT ==========`);
    console.log(`[App] ${projects.length} project(s) selected`);
    projects.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));

    setSelectedProject(mainProject);
    setSelectedProjects(projects);
    setCurrentScreen("hub");

    console.log(`[App] Calling projectSync.activateProject()...`);
    // Активировать актуаторы и LED для первого проекта
    await projectSync.activateProject(mainProject);
    console.log(`[App] projectSync.activateProject() completed`);
    console.log(`[App] ========================================`);
  };

  // Navigate back to gallery
  const handleBackToGallery = async () => {
    // Деактивировать актуаторы и LED
    await projectSync.deactivateProject();

    setCurrentScreen("gallery");
    setSelectedProject(null);
    setSelectedProjects([]);
  };

  // Video playback
  const handleVideoPlay = (scene: Scene) => {
    setActiveVideoScene(scene);
    setIsVideoOpen(true);
  };

  const handleVideoClose = () => {
    setIsVideoOpen(false);
    setActiveVideoScene(null);
  };

  // Info modal
  const handleInfoOpen = () => {
    setIsInfoModalOpen(true);
  };

  const handleInfoClose = () => {
    setIsInfoModalOpen(false);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Gallery / Main Menu */}
        {currentScreen === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProjectGallery
              projects={visibleProjects}
              theme={theme}
              onProjectSelect={handleProjectSelect}
              onAboutCompany={() => setIsAboutCompanyOpen(true)}
              connectionStatus={projectSync.isConnected ? "online" : "offline"}
              esp32Client={projectSync.client}
            />

            {/* ESP32 Status Indicator */}
            {projectSync.isAnimating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 right-8 z-50 bg-cyan-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span className="font-medium">Активация актуаторов...</span>
              </motion.div>
            )}

            {/* Control Buttons */}
            {projectSync.isConnected && !projectSync.isAnimating && (
              <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-3">
                {/* Actuator Control Panel Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={() => setIsActuatorControlOpen(true)}
                  className="bg-cyan-600/90 hover:bg-cyan-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-medium">Управление актуаторами</span>
                </motion.button>

                {/* Lower All Blocks Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => projectSync.lowerAllBlocks()}
                  className="bg-orange-600/90 hover:bg-orange-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="font-medium">Опустить все блоки</span>
                </motion.button>
              </div>
            )}

            {/* About Company Modal */}
            <AboutCompany
              isOpen={isAboutCompanyOpen}
              onClose={() => setIsAboutCompanyOpen(false)}
              theme={theme}
            />
          </motion.div>
        )}

        {/* Project Hub */}
        {currentScreen === "hub" && selectedProjects.length > 0 && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, x: 100, scale: 1.05 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.95 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProjectHub
              projects={selectedProjects}
              theme={theme}
              onBack={handleBackToGallery}
              onVideoPlay={handleVideoPlay}
              onInfoOpen={handleInfoOpen}
            />

            {/* Video Player Modal */}
            <FullscreenVideo
              isOpen={isVideoOpen}
              videoSrc={activeVideoScene?.video}
              posterSrc={activeVideoScene?.image}
              onClose={handleVideoClose}
            />

            {/* Info Modal */}
            <InfoModal
              isOpen={isInfoModalOpen}
              project={selectedProjects[0] || null}
              onClose={handleInfoClose}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSave={loadVisibilitySettings}
      />

      {/* Actuator Control Panel */}
      {isActuatorControlOpen && (
        <ActuatorControl onClose={() => setIsActuatorControlOpen(false)} />
      )}

      {/* Idle Screensaver - shows after 5 minutes of inactivity */}
      <Screensaver idleTimeout={IDLE_SCREENSAVER_TIMEOUT} />
    </div>
  );
}
