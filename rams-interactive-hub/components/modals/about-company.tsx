/**
 * About Company Modal Component
 * Информация о RAMS Global
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useLanguage } from "@/lib/i18n";

export interface AboutCompanyProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export const AboutCompany: React.FC<AboutCompanyProps> = ({
  isOpen,
  onClose,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const { t } = useLanguage();

  const stats = [
    { label: t("foundedYear"), value: "1988", icon: "event" },
    { label: t("countriesPresence"), value: "6", icon: "public" },
    { label: t("cities"), value: "11", icon: "location_city" },
    { label: t("employees"), value: "25,000+", icon: "group" },
    { label: t("completedProjects"), value: "100+", icon: "apartment" },
  ];

  const values = [
    { title: t("trust"), icon: "handshake", description: t("trustDesc") },
    { title: t("conscience"), icon: "favorite", description: t("conscienceDesc") },
    { title: t("justice"), icon: "balance", description: t("justiceDesc") },
    { title: t("socialBenefit"), icon: "volunteer_activism", description: t("socialBenefitDesc") },
    { title: t("sustainability"), icon: "eco", description: t("sustainabilityDesc") },
  ];

  const sectors = [
    t("realEstate"),
    t("tourism"),
    t("healthcare"),
    t("mining"),
    t("foodAndBeverages"),
    t("coworking"),
    t("furniture"),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              "fixed inset-x-0 top-0 bottom-0 z-50 mx-auto w-full max-w-5xl",
              "shadow-2xl overflow-hidden flex flex-col",
              isDark ? "bg-surface-dark" : "bg-surface-light"
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div
              className={cn(
                "relative flex items-center justify-between p-6 border-b",
                isDark ? "border-border-dark" : "border-border-light"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  isDark ? "bg-primary/10" : "bg-primary-dark/10"
                )}>
                  <Icon
                    name="business"
                    size="xl"
                    className={isDark ? "text-primary" : "text-primary-dark"}
                  />
                </div>
                <div>
                  <h2
                    className={cn(
                      "text-2xl font-bold tracking-wider uppercase mb-1",
                      isDark ? "text-text-light" : "text-text-dark"
                    )}
                  >
                    RAMS GLOBAL
                  </h2>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-text-muted-dark" : "text-text-muted"
                  )}>
                    {t("companySlogan")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  isDark
                    ? "hover:bg-border-dark text-text-light"
                    : "hover:bg-border-light text-text-dark"
                )}
              >
                <Icon name="close" size="lg" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              className={cn(
                "flex-1 overflow-y-auto p-8 space-y-8",
                isDark
                  ? "scrollbar-thumb-border-dark scrollbar-track-background-dark"
                  : "scrollbar-thumb-border-light scrollbar-track-background-light"
              )}
            >
              {/* Mission & Vision */}
              <section>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-wide mb-4 flex items-center gap-2",
                    isDark ? "text-text-light" : "text-text-dark"
                  )}
                >
                  <Icon name="lightbulb" className="text-primary" />
                  {t("missionAndVision")}
                </h3>
                <div className="space-y-3">
                  <p
                    className={cn(
                      "text-base leading-relaxed",
                      isDark ? "text-text-muted-dark" : "text-text-muted"
                    )}
                  >
                    {t("missionText")}
                  </p>
                </div>
              </section>

              {/* History */}
              <section>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-wide mb-4 flex items-center gap-2",
                    isDark ? "text-text-light" : "text-text-dark"
                  )}
                >
                  <Icon name="history" className="text-primary" />
                  {t("history")}
                </h3>
                <p
                  className={cn(
                    "text-base leading-relaxed",
                    isDark ? "text-text-muted-dark" : "text-text-muted"
                  )}
                >
                  {t("historyText")}
                </p>
              </section>

              {/* Stats Grid */}
              <section>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-wide mb-6 flex items-center gap-2",
                    isDark ? "text-text-light" : "text-text-dark"
                  )}
                >
                  <Icon name="analytics" className="text-primary" />
                  {t("keyMetrics")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className={cn(
                        "p-4 rounded-lg border text-center",
                        isDark
                          ? "bg-border-dark/10 border-border-dark hover:border-primary/30"
                          : "bg-border-light/10 border-border-light hover:border-primary-dark/30",
                        "transition-colors"
                      )}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Icon
                        name={stat.icon}
                        size="lg"
                        className={cn(
                          "mx-auto mb-2",
                          isDark ? "text-primary" : "text-primary-dark"
                        )}
                      />
                      <div
                        className={cn(
                          "text-2xl font-bold mb-1",
                          isDark ? "text-text-light" : "text-text-dark"
                        )}
                      >
                        {stat.value}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          isDark ? "text-text-muted-dark" : "text-text-muted"
                        )}
                      >
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Core Values */}
              <section>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-wide mb-6 flex items-center gap-2",
                    isDark ? "text-text-light" : "text-text-dark"
                  )}
                >
                  <Icon name="stars" className="text-primary" />
                  {t("ourValues")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {values.map((value, index) => (
                    <motion.div
                      key={value.title}
                      className={cn(
                        "p-5 rounded-lg border group",
                        isDark
                          ? "bg-border-dark/10 border-border-dark hover:border-primary/30"
                          : "bg-border-light/10 border-border-light hover:border-primary-dark/30",
                        "transition-all hover:shadow-lg"
                      )}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Icon
                        name={value.icon}
                        size="lg"
                        className={cn(
                          "mb-3 transition-colors",
                          isDark
                            ? "text-text-muted-dark group-hover:text-primary"
                            : "text-text-muted group-hover:text-primary-dark"
                        )}
                      />
                      <h4
                        className={cn(
                          "font-bold text-lg mb-2",
                          isDark ? "text-text-light" : "text-text-dark"
                        )}
                      >
                        {value.title}
                      </h4>
                      <p
                        className={cn(
                          "text-sm",
                          isDark ? "text-text-muted-dark" : "text-text-muted"
                        )}
                      >
                        {value.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Sectors */}
              <section>
                <h3
                  className={cn(
                    "text-xl font-bold tracking-wide mb-6 flex items-center gap-2",
                    isDark ? "text-text-light" : "text-text-dark"
                  )}
                >
                  <Icon name="category" className="text-primary" />
                  {t("businessSectors")}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {sectors.map((sector, index) => (
                    <motion.div
                      key={sector}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Badge variant="outline" className="px-4 py-2 text-sm">
                        {sector}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div
              className={cn(
                "p-6 border-t flex items-center justify-between",
                isDark ? "border-border-dark" : "border-border-light"
              )}
            >
              <div
                className={cn(
                  "text-sm",
                  isDark ? "text-text-muted-dark" : "text-text-muted"
                )}
              >
                © 1988-2026 RAMS Global. {t("allRightsReserved")}
              </div>
              <Button variant="primary" size="md" onClick={onClose}>
                {t("close")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
