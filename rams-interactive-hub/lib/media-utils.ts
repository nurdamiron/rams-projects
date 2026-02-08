/**
 * Media Utility
 * Handles media URL resolution for both development (Browser) and production (Electron/Kiosk).
 */

declare global {
    interface Window {
        electron?: {
            isElectron: boolean;
            getMediaRoot: () => Promise<string>;
        };
    }
}

/**
 * Returns the correct URL for a media asset.
 * 
 * @param path - The relative path to the media file (e.g., "/images/projects/photo.jpg")
 * @returns The resolved URL (e.g., "media:///images/projects/photo.jpg" or "/images/projects/photo.jpg")
 */
export function getMediaUrl(path: string | undefined): string {
    if (!path) return "";

    // If it's an external URL (http/https), return as is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Check if running in Electron
    const isElectron = typeof window !== "undefined" && window.electron?.isElectron;

    if (isElectron) {
        // In Electron, use the custom media protocol
        // Triple slash: media:///path (no hostname)
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        return `media:///${encodeURI(cleanPath)}`;
    }

    // In standard web/dev environment, encode the path for URL compatibility
    // This handles cyrillic characters and spaces in filenames
    return encodeURI(path);
}
