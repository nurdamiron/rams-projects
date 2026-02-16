/**
 * Project Sync Hook
 * Синхронизация проектов с актуаторами и LED
 */

import * as React from "react";
import { Project } from "@/lib/types";
import { ESP32Client, createLocalESP32Client } from "@/lib/esp32-client";

// Генерация цветов для проектов (градиент по кругу)
const generateProjectColor = (index: number, total: number): { r: number; g: number; b: number } => {
  const hue = (index / total) * 360; // Распределение по цветовому кругу

  // HSL to RGB conversion
  const h = hue / 60;
  const c = 255;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 1) { r = c; g = x; b = 0; }
  else if (h >= 1 && h < 2) { r = x; g = c; b = 0; }
  else if (h >= 2 && h < 3) { r = 0; g = c; b = x; }
  else if (h >= 3 && h < 4) { r = 0; g = x; b = c; }
  else if (h >= 4 && h < 5) { r = x; g = 0; b = c; }
  else if (h >= 5 && h < 6) { r = c; g = 0; b = x; }

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
};

/**
 * Получить блоки для проекта по его индексу
 * @param projectIndex Индекс проекта в списке (0-based)
 * @returns Массив номеров блоков
 */
const getBlocksForProject = (projectIndex: number): number[] => {
  // Первые 15 проектов управляют блоками 1-15 (по одному блоку)
  // Проекты 16+ не управляют актуаторами

  if (projectIndex < 0 || projectIndex >= 15) {
    return []; // Проекты вне диапазона 0-14 не управляют актуаторами
  }

  // Прямое соответствие: проект N → блок N+1
  // Проект 0 → блок 1
  // Проект 1 → блок 2
  // ...
  // Проект 14 → блок 15
  const blockNum = projectIndex + 1;

  return [blockNum];
};

export interface ProjectSyncOptions {
  projects?: Project[];        // Список всех проектов (для определения индекса)
  enableActuators?: boolean;  // Включить управление актуаторами
  enableLED?: boolean;         // Включить управление LED
  animationDuration?: number;  // Длительность подъема актуаторов (мс)
  fadeInDuration?: number;     // Длительность плавного включения LED (мс)
  autoConnect?: boolean;       // Автоматическое подключение к ESP32
}

const DEFAULT_OPTIONS: ProjectSyncOptions = {
  enableActuators: true,
  enableLED: true,
  animationDuration: 6000,  // 6 секунд подъем
  fadeInDuration: 3000,     // 3 секунды плавное свечение
  autoConnect: true,
};

export function useProjectSync(options: ProjectSyncOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [client] = React.useState(() => createLocalESP32Client());
  const [isConnected, setIsConnected] = React.useState(false);
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Проверка подключения
  React.useEffect(() => {
    if (!opts.autoConnect) {
      console.log("[ProjectSync] Auto-connect disabled");
      return;
    }

    console.log("[ProjectSync] Starting auto-connect to ESP32...");

    const checkConnection = async () => {
      try {
        console.log("[ProjectSync] Pinging ESP32 at 192.168.4.1...");
        const connected = await client.ping();
        if (connected !== isConnected) {
          console.log(`[ProjectSync] Connection status changed: ${connected ? '✅ ONLINE' : '❌ OFFLINE'}`);
        }
        setIsConnected(connected);
      } catch (err) {
        console.error("[ProjectSync] Ping failed:", err);
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => {
      console.log("[ProjectSync] Stopping auto-connect");
      clearInterval(interval);
    };
  }, [client, opts.autoConnect]);

  /**
   * Плавное включение LED (очень плавно, без бликов)
   */
  const fadeInLED = React.useCallback(async (
    r: number,
    g: number,
    b: number,
    duration: number
  ) => {
    const steps = 60; // Больше шагов = плавнее
    const stepDelay = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const brightness = Math.floor((i / steps) * 200); // 0 -> 200
      try {
        await client.setLEDBrightness(brightness);
        await new Promise(resolve => setTimeout(resolve, stepDelay));
      } catch (err) {
        console.error("[ProjectSync] Failed to fade in LED:", err);
        break;
      }
    }

    // Финальная установка яркости на максимум
    console.log("[ProjectSync] ✅ LED fade-in completed. Setting final brightness to 200...");
    await client.setLEDBrightness(200);
    console.log("[ProjectSync] ✅ LED brightness locked at 200 until project exit");
  }, [client]);

  /**
   * Активировать проект (поднять актуаторы + включить LED)
   */
  const activateProject = React.useCallback(async (project: Project) => {
    console.log(`[ProjectSync] ============ ACTIVATION START ============`);
    console.log(`[ProjectSync] Project: ${project.name} (ID: ${project.id})`);
    console.log(`[ProjectSync] ESP32 Connected: ${isConnected}`);
    console.log(`[ProjectSync] Is Animating: ${isAnimating}`);
    console.log(`[ProjectSync] Enable Actuators: ${opts.enableActuators}`);
    console.log(`[ProjectSync] Enable LED: ${opts.enableLED}`);

    if (!isConnected) {
      console.warn("[ProjectSync] ❌ ESP32 not connected. Skipping activation.");
      return;
    }

    if (isAnimating) {
      console.warn("[ProjectSync] ❌ Animation in progress. Skipping.");
      return;
    }

    setIsAnimating(true);
    setActiveProject(project);

    // Найти индекс проекта в списке
    const projectIndex = opts.projects?.findIndex(p => p.id === project.id) ?? -1;
    console.log(`[ProjectSync] Project Index: ${projectIndex} (out of ${opts.projects?.length || 0} projects)`);

    if (projectIndex === -1) {
      console.error(`[ProjectSync] ❌ Project ${project.id} not found in projects list`);
      setIsAnimating(false);
      return;
    }

    // Получить блоки и цвет для проекта по индексу
    const blocks = getBlocksForProject(projectIndex);
    const color = generateProjectColor(projectIndex, opts.projects?.length || 8);
    console.log(`[ProjectSync] Blocks to activate: [${blocks.join(', ')}]`);
    console.log(`[ProjectSync] LED Color: RGB(${color.r}, ${color.g}, ${color.b})`);

    try {
      // 1. Установить цвет LED (мгновенно, но с яркостью 0)
      if (opts.enableLED) {
        console.log(`[ProjectSync] Setting LED color...`);
        await client.setLEDColor(color.r, color.g, color.b);
        console.log(`[ProjectSync] Setting LED brightness to 0...`);
        await client.setLEDBrightness(0);
        console.log(`[ProjectSync] Setting LED effect to 0 (static)...`);
        await client.setLEDEffect(0); // Static effect
      }

      // 2. Запустить подъем актуаторов и плавное включение LED ПАРАЛЛЕЛЬНО
      const tasks = [];

      if (opts.enableActuators && blocks.length > 0) {
        console.log(`[ProjectSync] Starting actuator raise sequence...`);
        const actuatorTask = (async () => {
          // Поднимаем блоки последовательно с небольшой задержкой
          for (let i = 0; i < blocks.length; i++) {
            console.log(`[ProjectSync] 📈 Raising block ${blocks[i]} (${i + 1}/${blocks.length})...`);
            await client.blockUp(blocks[i], opts.animationDuration);
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms между блоками
          }
          console.log(`[ProjectSync] ✅ All blocks raised`);
        })();
        tasks.push(actuatorTask);
      }

      if (opts.enableLED) {
        console.log(`[ProjectSync] 💡 Starting LED fade-in...`);
        const ledTask = fadeInLED(color.r, color.g, color.b, opts.fadeInDuration || 3000);
        tasks.push(ledTask);
      }

      // Дождаться завершения всех задач
      await Promise.all(tasks);

      console.log(`[ProjectSync] ✅ Activated project: ${project.name}`);
      console.log(`[ProjectSync] ✅ LED will stay ON until project exit`);
      console.log(`[ProjectSync] ============ ACTIVATION END ============`);
    } catch (err) {
      console.error(`[ProjectSync] ❌ Failed to activate project:`, err);
    } finally {
      setIsAnimating(false);
    }
  }, [client, isConnected, isAnimating, opts, fadeInLED]);

  /**
   * Деактивировать проект (опустить актуаторы + выключить LED)
   */
  const deactivateProject = React.useCallback(async () => {
    if (!isConnected || !activeProject) return;

    // Найти индекс активного проекта
    const projectIndex = opts.projects?.findIndex(p => p.id === activeProject.id) ?? -1;
    const blocks = projectIndex !== -1 ? getBlocksForProject(projectIndex) : [];

    try {
      // 1. ОЧЕНЬ плавно погасить LED (5 секунд, 100 шагов)
      if (opts.enableLED) {
        console.log("[ProjectSync] 💡 Fading out LED (5 seconds)...");
        const fadeOutSteps = 100;
        const fadeOutDuration = 5000; // 5 секунд
        const stepDelay = fadeOutDuration / fadeOutSteps;

        for (let i = fadeOutSteps; i >= 0; i--) {
          const brightness = Math.floor((i / fadeOutSteps) * 200); // 200 -> 0
          await client.setLEDBrightness(brightness);
          await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
        console.log("[ProjectSync] ✅ LED faded out completely");
      }

      // 2. Опустить актуаторы И выключить LED зоны
      if (opts.enableActuators && blocks.length > 0) {
        console.log(`[ProjectSync] 📉 Lowering blocks and turning off LED zones...`);
        for (const blockNum of blocks) {
          await client.blockDown(blockNum, 8000); // 8 секунд вниз + выключает ledStates[blockNum]
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else if (blocks.length > 0) {
        // Если актуаторы отключены, но нужно выключить LED
        console.log(`[ProjectSync] 💡 Turning off LED zones (actuators disabled)...`);
        for (const blockNum of blocks) {
          await client.blockStop(blockNum); // Выключает ledStates[blockNum] без движения актуатора
        }
      }

      console.log(`[ProjectSync] ✅ Deactivated project: ${activeProject.name}`);
      setActiveProject(null);
    } catch (err) {
      console.error(`[ProjectSync] ❌ Failed to deactivate project:`, err);
    }
  }, [client, isConnected, activeProject, opts]);

  /**
   * Экстренная остановка всех блоков
   */
  const emergencyStop = React.useCallback(async () => {
    if (!isConnected) return;

    try {
      await client.stopAll();
      await client.setLEDBrightness(0);
      setActiveProject(null);
      setIsAnimating(false);
      console.log("[ProjectSync] Emergency stop executed");
    } catch (err) {
      console.error("[ProjectSync] Emergency stop failed:", err);
    }
  }, [client, isConnected]);

  /**
   * Последовательно опустить все блоки (1-15)
   */
  const lowerAllBlocks = React.useCallback(async () => {
    if (!isConnected) {
      console.warn("[ProjectSync] ❌ ESP32 not connected. Cannot lower blocks.");
      return;
    }

    if (isAnimating) {
      console.warn("[ProjectSync] ❌ Animation in progress. Please wait.");
      return;
    }

    setIsAnimating(true);
    console.log("[ProjectSync] ============ LOWER ALL START ============");

    try {
      // ОЧЕНЬ плавно погасить LED (5 секунд, 100 шагов)
      if (opts.enableLED) {
        console.log("[ProjectSync] 💡 Fading out LED (5 seconds)...");
        const fadeOutSteps = 100;
        const fadeOutDuration = 5000; // 5 секунд
        const stepDelay = fadeOutDuration / fadeOutSteps;

        for (let i = fadeOutSteps; i >= 0; i--) {
          const brightness = Math.floor((i / fadeOutSteps) * 200); // 200 -> 0
          await client.setLEDBrightness(brightness);
          await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
        console.log("[ProjectSync] ✅ LED faded out completely");
      }

      // Опустить все блоки последовательно
      if (opts.enableActuators) {
        console.log("[ProjectSync] 📉 Lowering all blocks sequentially...");
        for (let blockNum = 1; blockNum <= 15; blockNum++) {
          console.log(`[ProjectSync] 📉 Lowering block ${blockNum}/15...`);
          await client.blockDown(blockNum, 8000); // 8 секунд вниз
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms между блоками
        }
        console.log("[ProjectSync] ✅ All blocks lowered");
      }

      setActiveProject(null);
      console.log("[ProjectSync] ============ LOWER ALL END ============");
    } catch (err) {
      console.error("[ProjectSync] ❌ Failed to lower all blocks:", err);
    } finally {
      setIsAnimating(false);
    }
  }, [client, isConnected, isAnimating, opts]);

  return {
    isConnected,
    activeProject,
    isAnimating,
    activateProject,
    deactivateProject,
    emergencyStop,
    lowerAllBlocks, // Опустить все блоки последовательно
    client, // Expose client for advanced usage
  };
}
