/**
 * API Route: Media Stats
 * Scans project folders and returns real media file counts
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface ProjectMediaStats {
  projectId: string;
  videos: number;
  photos: number;
  hasLogo: boolean;
  hasMainImage: boolean;
  videoFiles: string[];
  photoFiles: string[];
}

export async function GET() {
  const projectsPath = path.join(process.cwd(), "public", "projects");
  const stats: ProjectMediaStats[] = [];

  try {
    // Get all project folders
    const projectFolders = fs.readdirSync(projectsPath).filter((f) => {
      const fullPath = path.join(projectsPath, f);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const projectId of projectFolders) {
      const projectPath = path.join(projectsPath, projectId);
      const projectStats: ProjectMediaStats = {
        projectId,
        videos: 0,
        photos: 0,
        hasLogo: false,
        hasMainImage: false,
        videoFiles: [],
        photoFiles: [],
      };

      // Check images folder
      const imagesPath = path.join(projectPath, "images");
      if (fs.existsSync(imagesPath)) {
        // Check main image
        if (fs.existsSync(path.join(imagesPath, "main.jpg"))) {
          projectStats.hasMainImage = true;
          projectStats.photos++;
          projectStats.photoFiles.push("main.jpg");
        }

        // Check logo
        const logoPath = path.join(imagesPath, "logo");
        if (fs.existsSync(logoPath)) {
          const logoFiles = fs.readdirSync(logoPath);
          projectStats.hasLogo = logoFiles.some((f) => f.startsWith("logo."));
        }

        // Check scenes
        const scenesPath = path.join(imagesPath, "scenes");
        if (fs.existsSync(scenesPath)) {
          const sceneFiles = fs.readdirSync(scenesPath).filter((f) =>
            /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(f)
          );
          projectStats.photos += sceneFiles.length;
          projectStats.photoFiles.push(...sceneFiles);
        }
      }

      // Check videos folder
      const videosPath = path.join(projectPath, "videos");
      if (fs.existsSync(videosPath)) {
        const videoFiles = fs.readdirSync(videosPath).filter((f) =>
          /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(f)
        );
        projectStats.videos = videoFiles.length;
        projectStats.videoFiles = videoFiles;
      }

      stats.push(projectStats);
    }

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error scanning media:", error);
    return NextResponse.json(
      { success: false, error: "Failed to scan media" },
      { status: 500 }
    );
  }
}
