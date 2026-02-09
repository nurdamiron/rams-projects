import HardwareIPCService, { type BlockMapping } from "./hardware/wifi";
import { GALLERY_CARDS } from "./data/gallery-config";

/**
 * Hardware Service Facade (Client-Side)
 * Maps project IDs to physical block numbers and delegates to IPC service.
 * Custom block mapping (from admin panel) overrides the default values in gallery-config.
 */

// Cached custom mapping — loaded once, updated via setBlockMapping
let cachedMapping: BlockMapping | null = null;

/**
 * Resolve project ID → physical block number.
 * 1. Find the gallery card that contains this project
 * 2. Check custom mapping for that card ID (override)
 * 3. Fall back to the default blockNumber from gallery-config
 */
async function resolveBlockNumber(projectId: string): Promise<number | undefined> {
  const card = GALLERY_CARDS.find(c => c.projectIds.includes(projectId));
  if (!card) return undefined;

  // Load custom mapping if not cached yet
  if (cachedMapping === null) {
    const hw = HardwareIPCService.getInstance();
    cachedMapping = await hw.getBlockMapping();
  }

  // Custom mapping overrides default
  if (cachedMapping[card.id] !== undefined) {
    return cachedMapping[card.id];
  }

  return card.blockNumber;
}

export const hardwareService = {
  /**
   * Select a project — raises the corresponding physical block
   */
  async selectProject(projectId: string): Promise<boolean> {
    const blockNumber = await resolveBlockNumber(projectId);
    if (!blockNumber) {
      console.warn(`[HardwareService] No block number found for project: ${projectId}`);
      return false;
    }
    const hw = HardwareIPCService.getInstance();
    return hw.blockUp(blockNumber);
  },

  /**
   * Deselect a project — lowers the corresponding physical block
   */
  async deselectProject(projectId: string): Promise<boolean> {
    const blockNumber = await resolveBlockNumber(projectId);
    if (!blockNumber) return false;
    const hw = HardwareIPCService.getInstance();
    return hw.blockDown(blockNumber);
  },

  /**
   * Reset all — lower all blocks
   */
  async resetAll(): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.allDown();
  },

  /**
   * Emergency stop — immediately stop all actuators
   */
  async emergencyStop(): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.allStop();
  },

  /**
   * Set LED mode (RAINBOW, PULSE, WAVE, STATIC, OFF)
   */
  async setLedMode(mode: string): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.setLedMode(mode);
  },

  /**
   * Set LED color (hex string without #, e.g. "FF0000")
   */
  async setLedColor(hexColor: string): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.setLedColor(hexColor);
  },

  /**
   * Set LED brightness (0-255)
   */
  async setLedBrightness(brightness: number): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.setLedBrightness(brightness);
  },

  /**
   * Get hardware connection status
   */
  async getStatus() {
    const hw = HardwareIPCService.getInstance();
    return hw.getStatus();
  },

  /**
   * Set ESP32 IP address
   */
  async setIP(ip: string): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    return hw.setIP(ip);
  },

  /**
   * Ping ESP32
   */
  async ping() {
    const hw = HardwareIPCService.getInstance();
    return hw.ping();
  },

  /**
   * Get current block mapping (custom overrides)
   */
  async getBlockMapping(): Promise<BlockMapping> {
    const hw = HardwareIPCService.getInstance();
    const mapping = await hw.getBlockMapping();
    cachedMapping = mapping;
    return mapping;
  },

  /**
   * Save custom block mapping and invalidate cache
   */
  async setBlockMapping(mapping: BlockMapping): Promise<boolean> {
    const hw = HardwareIPCService.getInstance();
    const success = await hw.setBlockMapping(mapping);
    if (success) {
      cachedMapping = mapping;
    }
    return success;
  },
};
