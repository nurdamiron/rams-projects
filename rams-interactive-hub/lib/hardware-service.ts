import { Project } from "./types";
import WiFiHardwareService from "./hardware/wifi";
import { RAMS_PROJECTS } from "./data/projects";

/**
 * Service to communicate with the hardware directly (Client-Side)
 */
export const hardwareService = {
  /**
   * Helper: Resolve projectId string (slug) to hardwareId (number)
   */
  resolveProjectId(projectId: string | number): number | undefined {
    if (typeof projectId === "number") return projectId;
    const project = RAMS_PROJECTS.find((p) => p.id === projectId);
    return project?.hardwareId; // Returns undefined if not found, which is fine (optional)
  },

  /**
   * Send a raw command to the hardware via WiFi Service
   */
  async sendCommand(payload: any) {
    try {
      const wifi = WiFiHardwareService.getInstance();

      // If payload has a projectId, resolve it before sending
      if (payload.projectId) {
        const resolvedId = this.resolveProjectId(payload.projectId);
        if (resolvedId) {
          payload.projectId = resolvedId;
        }
      }

      const success = await wifi.sendCommand(payload);
      return { success };
    } catch (error) {
      console.error("Hardware Service Error:", error);
      return { success: false, error };
    }
  },

  /**
   * Control project lighting
   */
  async setProjectLighting(projectId: string | number, isActive: boolean) {
    return this.sendCommand({
      action: isActive ? "highlight" : "off",
      projectId: projectId,
      data: { isActive }
    });
  },

  /**
   * Control Actuators (Lift/Roof)
   */
  async setActuatorState(element: string, state: "up" | "down") {
    return this.sendCommand({
      action: "actuator",
      target: element,
      state: state
    });
  },

  /**
   * Reset all hardware effects
   */
  async resetAll() {
    return this.sendCommand({
      action: "reset"
    });
  },

  /**
   * Cancel all pending hardware commands
   * Useful when user exits or navigates away quickly
   */
  cancelPending() {
    const wifi = WiFiHardwareService.getInstance();
    wifi.cancelPending();
  },

  /**
   * Get currently active project on hardware
   */
  getCurrentProject() {
    const wifi = WiFiHardwareService.getInstance();
    return wifi.getCurrentProject();
  }
};
