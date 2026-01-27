/**
 * Admin Modal - Project Visibility Settings
 * Modal version for kiosk mode
 * Access via Ctrl+Shift+A
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RAMS_PROJECTS } from "@/lib/data/projects";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface MediaStats {
  projectId: string;
  videos: number;
  photos: number;
  hasLogo: boolean;
  hasMainImage: boolean;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>({});
  const [saved, setSaved] = React.useState(false);
  const [mediaStats, setMediaStats] = React.useState<Record<string, MediaStats>>({});
  const [loadingStats, setLoadingStats] = React.useState(true);

  // Load real media stats from API
  React.useEffect(() => {
    if (!isOpen) return;

    fetch("/api/media-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const statsMap: Record<string, MediaStats> = {};
          data.stats.forEach((s: MediaStats) => {
            statsMap[s.projectId] = s;
          });
          setMediaStats(statsMap);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, [isOpen]);

  // Load saved visibility from localStorage
  React.useEffect(() => {
    if (!isOpen) return;

    const savedVisibility = localStorage.getItem("rams-project-visibility");
    if (savedVisibility) {
      setVisibility(JSON.parse(savedVisibility));
    } else {
      const defaultVisibility: Record<string, boolean> = {};
      RAMS_PROJECTS.forEach((p) => {
        defaultVisibility[p.id] = true;
      });
      setVisibility(defaultVisibility);
    }
  }, [isOpen]);

  // Escape key to close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle project visibility
  const toggleProject = (id: string) => {
    setVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setSaved(false);
  };

  // Select all
  const selectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    RAMS_PROJECTS.forEach((p) => {
      newVisibility[p.id] = true;
    });
    setVisibility(newVisibility);
    setSaved(false);
  };

  // Deselect all
  const deselectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    RAMS_PROJECTS.forEach((p) => {
      newVisibility[p.id] = false;
    });
    setVisibility(newVisibility);
    setSaved(false);
  };

  // Select only projects with media
  const selectWithMedia = () => {
    const newVisibility: Record<string, boolean> = {};
    RAMS_PROJECTS.forEach((p) => {
      const stats = mediaStats[p.id];
      const hasRealMedia = stats ? (stats.videos > 0 || stats.photos > 0) : false;
      newVisibility[p.id] = hasRealMedia;
    });
    setVisibility(newVisibility);
    setSaved(false);
  };

  // Save settings
  const saveSettings = () => {
    localStorage.setItem("rams-project-visibility", JSON.stringify(visibility));
    setSaved(true);
    onSave?.();
    setTimeout(() => setSaved(false), 2000);
  };

  // Count visible projects
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  // Calculate total media stats
  const totalVideos = Object.values(mediaStats).reduce((sum, s) => sum + s.videos, 0);
  const totalPhotos = Object.values(mediaStats).reduce((sum, s) => sum + s.photos, 0);
  const projectsWithMedia = Object.values(mediaStats).filter(s => s.videos > 0 || s.photos > 0).length;
  const projectsWithLogo = Object.values(mediaStats).filter(s => s.hasLogo).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 z-[101] bg-gray-900 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h1 className="text-2xl font-bold text-white">Настройки проектов</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Выберите проекты для отображения • {visibleCount} из {RAMS_PROJECTS.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10"
              >
                <Icon name="close" className="text-white" />
              </Button>
            </div>

            {/* Media Stats Summary */}
            <div className="grid grid-cols-4 gap-3 p-6 pb-0">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{totalVideos}</div>
                <div className="text-xs text-gray-400">Видео</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{totalPhotos}</div>
                <div className="text-xs text-gray-400">Фото</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{projectsWithLogo}</div>
                <div className="text-xs text-gray-400">С логотипом</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{projectsWithMedia}</div>
                <div className="text-xs text-gray-400">С медиа</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 p-6">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-white text-sm font-medium"
              >
                Выбрать все
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white text-sm font-medium"
              >
                Снять все
              </button>
              <button
                onClick={selectWithMedia}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium"
              >
                Только с медиа
              </button>
              <div className="flex-1" />
              <button
                onClick={saveSettings}
                className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                  saved
                    ? "bg-green-500 text-white"
                    : "bg-primary hover:bg-primary/90 text-white"
                }`}
              >
                {saved ? "Сохранено!" : "Сохранить"}
              </button>
            </div>

            {/* Project Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {RAMS_PROJECTS.map((project, index) => {
                  const isVisible = visibility[project.id] !== false;
                  const stats = mediaStats[project.id];
                  const videoCount = stats?.videos || 0;
                  const photoCount = stats?.photos || 0;
                  const hasLogo = stats?.hasLogo || false;
                  const totalMedia = videoCount + photoCount;

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => toggleProject(project.id)}
                      className={`relative p-3 rounded-xl cursor-pointer transition-all border-2 ${
                        isVisible
                          ? "bg-gray-800 border-primary"
                          : "bg-gray-800/50 border-gray-700 opacity-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center ${
                          isVisible ? "bg-primary" : "bg-gray-600"
                        }`}
                      >
                        {isVisible && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Project Number */}
                      <div className="text-[10px] text-gray-500 mb-0.5">
                        #{index + 1}
                      </div>

                      {/* Project Name */}
                      <h3 className="font-bold text-sm leading-tight text-white pr-6">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">{project.title}</p>

                      {/* Status Badge */}
                      <div
                        className={`mt-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          project.status === "Строится" || project.status.includes("очередь")
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {project.status}
                      </div>

                      {/* Media Stats */}
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className={`flex items-center gap-0.5 ${videoCount > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                            <Icon name="videocam" size="sm" />
                            <span>{videoCount}</span>
                          </div>
                          <div className={`flex items-center gap-0.5 ${photoCount > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                            <Icon name="photo" size="sm" />
                            <span>{photoCount}</span>
                          </div>
                          <div className={`${hasLogo ? 'text-purple-400' : 'text-gray-600'}`}>
                            {hasLogo ? '✓' : '✗'}
                          </div>
                        </div>
                        {totalMedia === 0 && (
                          <div className="mt-1 text-[10px] text-red-400">
                            Нет медиа
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 text-center text-gray-500 text-xs">
              Ctrl+Shift+A — открыть настройки • Escape — закрыть
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
