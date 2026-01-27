/**
 * RAMS Interactive Hub - Main Application
 * Premium real estate presentation system
 */

"use client";

import * as React from "react";
import { Screensaver } from "@/components/screensaver";
import { ProjectGallery } from "@/components/gallery";
import { ProjectHub } from "@/components/hub/project-hub";
import { FullscreenVideo } from "@/components/video-player/fullscreen-video";
import { InfoModal } from "@/components/modals/info-modal";
import { AboutCompany } from "@/components/modals/about-company";
import { AdminModal } from "@/components/modals/admin-modal";
import { RAMS_PROJECTS } from "@/lib/data/projects";
import { Project, Scene } from "@/lib/types";
import { useTheme } from "@/lib/theme-context";

type AppScreen = "gallery" | "hub";

export default function Home() {
  const { theme } = useTheme();

  // App State - start directly on gallery
  const [currentScreen, setCurrentScreen] = React.useState<AppScreen>("gallery");
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [isVideoOpen, setIsVideoOpen] = React.useState(false);
  const [activeVideoScene, setActiveVideoScene] = React.useState<Scene | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = React.useState(false);
  const [isAboutCompanyOpen, setIsAboutCompanyOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>(RAMS_PROJECTS);
  const [visibleProjects, setVisibleProjects] = React.useState<Project[]>(RAMS_PROJECTS);

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

  // Keyboard shortcut: Ctrl+Shift+A to open admin modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsAdminOpen(true);
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

  // Project selection from gallery
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentScreen("hub");
  };

  // Navigate back to gallery
  const handleBackToGallery = () => {
    setCurrentScreen("gallery");
    setSelectedProject(null);
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
      {/* Gallery / Main Menu */}
      {currentScreen === "gallery" && (
        <>
          <ProjectGallery
            projects={visibleProjects}
            theme={theme}
            onProjectSelect={handleProjectSelect}
            onAboutCompany={() => setIsAboutCompanyOpen(true)}
            connectionStatus="online"
          />

          {/* About Company Modal */}
          <AboutCompany
            isOpen={isAboutCompanyOpen}
            onClose={() => setIsAboutCompanyOpen(false)}
            theme={theme}
          />
        </>
      )}

      {/* Project Hub */}
      {currentScreen === "hub" && selectedProject && (
        <>
          <ProjectHub
            project={selectedProject}
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
            project={selectedProject}
            onClose={handleInfoClose}
            theme={theme}
          />
        </>
      )}

      {/* Admin Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSave={loadVisibilitySettings}
      />

      {/* Idle Screensaver - shows after 5 minutes of inactivity */}
      <Screensaver idleTimeout={IDLE_SCREENSAVER_TIMEOUT} />
    </div>
  );
}
