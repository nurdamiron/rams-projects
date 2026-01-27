/**
 * Fullscreen Video Player Component
 * Immersive video playback experience
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { getMediaUrl } from "@/lib/media-utils";

export interface FullscreenVideoProps {
  isOpen: boolean;
  videoSrc?: string;
  posterSrc?: string;
  onClose: () => void;
}

export const FullscreenVideo: React.FC<FullscreenVideoProps> = ({
  isOpen,
  videoSrc,
  posterSrc,
  onClose,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
    }
  }, [isOpen]);

  const resolvedVideoSrc = getMediaUrl(videoSrc);
  const resolvedPosterSrc = getMediaUrl(posterSrc);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Video or Poster Image */}
          {resolvedVideoSrc ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster={resolvedPosterSrc}
              controls
              autoPlay
            >
              <source src={resolvedVideoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <motion.div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url('${resolvedPosterSrc}')` }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 20, repeat: Infinity }}
            />
          )}

          {/* Top Gradient for Button Visibility */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Close Button */}
          <motion.button
            className={cn(
              "absolute top-6 right-6 w-16 h-16 rounded-full",
              "bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20",
              "flex items-center justify-center transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            )}
            onClick={onClose}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Icon name="close" size="2xl" className="text-white" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
