"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Waves, Flame, Star, Rainbow, Zap, Circle, ChevronDown, ChevronUp } from "lucide-react"
import { ESP32Client } from "@/lib/esp32-client"
import { cn } from "@/lib/utils"

const EFFECTS = [
  { id: 0, name: "Static", icon: Circle, description: "Статичный свет" },
  { id: 1, name: "Pulse", icon: Zap, description: "Пульсация" },
  { id: 2, name: "Rainbow", icon: Rainbow, description: "Радуга" },
  { id: 3, name: "Chase", icon: Waves, description: "Бегущий огонь" },
  { id: 4, name: "Sparkle", icon: Sparkles, description: "Искры" },
  { id: 5, name: "Wave", icon: Waves, description: "Волна" },
  { id: 6, name: "Fire", icon: Flame, description: "Огонь" },
  { id: 7, name: "Meteor", icon: Star, description: "Метеор" },
]

interface EffectControlProps {
  esp32Client: ESP32Client
  className?: string
}

export function EffectControl({ esp32Client, className }: EffectControlProps) {
  const [selectedEffect, setSelectedEffect] = useState(0)
  const [speed, setSpeed] = useState(128)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleEffectChange = async (effectId: number) => {
    try {
      setIsLoading(true)
      await esp32Client.setLEDEffect(effectId, speed)
      setSelectedEffect(effectId)
    } catch (error) {
      console.error(`Failed to set effect:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed)
    try {
      await esp32Client.setLEDEffect(selectedEffect, newSpeed)
    } catch (error) {
      console.error(`Failed to set speed:`, error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "backdrop-blur-md bg-black/20 border border-white/10 rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">LED Effects</span>
          <span className="text-xs text-gray-400">
            {EFFECTS[selectedEffect].name}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Effect Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {EFFECTS.map((effect) => {
                  const Icon = effect.icon
                  const isActive = selectedEffect === effect.id

                  return (
                    <motion.button
                      key={effect.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEffectChange(effect.id)}
                      disabled={isLoading}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                        isActive
                          ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                      title={effect.description}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-cyan-400")} />
                      <span className="text-xs font-medium">{effect.name}</span>

                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeEffect"
                          className="absolute inset-0 border-2 border-cyan-400 rounded-lg"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Speed Control */}
              {selectedEffect !== 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Speed</span>
                    <span className="text-cyan-400 font-mono">{speed}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={speed}
                    onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
