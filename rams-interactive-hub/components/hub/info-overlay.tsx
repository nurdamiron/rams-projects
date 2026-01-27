"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/lib/media-utils";
import { useLanguage } from "@/lib/i18n";

interface InfoOverlayProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    theme?: "light" | "dark";
}

export const InfoOverlay: React.FC<InfoOverlayProps> = ({
    project,
    isOpen,
    onClose,
    theme = "dark",
}) => {
    const isDark = theme === "dark";
    const logoSource = getMediaUrl(project.logo || project.image);
    const { t } = useLanguage();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sidebar Overlay */}
                    <motion.div
                        className={cn(
                            "fixed inset-y-0 right-0 z-50 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col",
                            "bg-gradient-to-b from-[#1a1816] to-[#0f0e0d]"
                        )}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    >
                        {/* Header with Logo */}
                        <div className="relative p-8 pb-6">
                            {/* Close Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <Icon name="close" className="text-white/80" />
                            </Button>

                            {/* Logo & Title */}
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-3 shadow-lg">
                                    <img
                                        src={logoSource}
                                        alt={project.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white tracking-tight">
                                        {project.name}
                                    </h2>
                                    {project.title && (
                                        <p className="text-lg text-white/60 font-medium mt-1">
                                            {project.title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-5 flex items-center gap-3">
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-semibold",
                                    project.status === "Строится" || project.status.includes("очередь")
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-emerald-500/20 text-emerald-400"
                                )}>
                                    {project.status}
                                </span>
                                {project.statusBadge && (
                                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/20 text-primary">
                                        {project.statusBadge}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 custom-scrollbar">

                            {/* Stats Grid - 4 items */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors">
                                    <Icon name="event" className="text-primary mb-2" size="sm" />
                                    <div className="text-2xl font-bold text-white">
                                        {project.info.deadline}
                                        {project.info.quarter && <span className="text-lg text-white/60 ml-1">{project.info.quarter}</span>}
                                    </div>
                                    <div className="text-sm text-white/50 mt-1">{t("deadline")}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors">
                                    <Icon name="business" className="text-primary mb-2" size="sm" />
                                    <div className="text-2xl font-bold text-white">{project.info.class}</div>
                                    <div className="text-sm text-white/50 mt-1">{t("housingClass")}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors">
                                    <Icon name="layers" className="text-primary mb-2" size="sm" />
                                    <div className="text-2xl font-bold text-white">{project.info.floors}</div>
                                    <div className="text-sm text-white/50 mt-1">{t("floors")}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors">
                                    <Icon name="apartment" className="text-primary mb-2" size="sm" />
                                    <div className="text-2xl font-bold text-white">
                                        {project.info.units > 0 ? project.info.units : "—"}
                                    </div>
                                    <div className="text-sm text-white/50 mt-1">{t("apartments")}</div>
                                </div>
                            </div>

                            {/* Ceiling Height & Location Row */}
                            <div className="flex gap-3">
                                <div className="flex-1 p-4 rounded-2xl bg-white/5 flex items-center gap-4">
                                    <Icon name="straighten" className="text-primary" />
                                    <div>
                                        <div className="text-lg font-bold text-white">{project.info.ceilingHeight}</div>
                                        <div className="text-sm text-white/50">{t("ceilingHeight")}</div>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 rounded-2xl bg-white/5 flex items-center gap-4">
                                    <Icon name="location_on" className="text-primary" />
                                    <div>
                                        <div className="text-lg font-bold text-white">{project.locations[0]?.label}</div>
                                        <div className="text-sm text-white/50">{project.locations[0]?.distance}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                    <Icon name="article" size="sm" />
                                    {t("aboutProject")}
                                </h3>
                                <p className="text-base leading-relaxed text-white/80">
                                    {project.description}
                                </p>
                            </section>

                            {/* Features */}
                            {project.features && project.features.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                        <Icon name="stars" size="sm" />
                                        {t("features")} ({project.features.length})
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {project.features.map((feature, idx) => (
                                            <motion.div
                                                key={idx}
                                                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                            >
                                                <Icon name="check_circle" className="text-primary mt-0.5 shrink-0" size="sm" />
                                                <span className="text-white/90 text-sm">{feature}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Concept Quote (if exists) */}
                            {project.concept && (
                                <section className="p-5 rounded-2xl bg-primary/10">
                                    <p className="text-primary italic text-lg leading-relaxed">
                                        "{project.concept}"
                                    </p>
                                </section>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 bg-black/30 flex items-center justify-end">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="text-white/60 hover:text-white hover:bg-white/10"
                            >
                                {t("close")}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
