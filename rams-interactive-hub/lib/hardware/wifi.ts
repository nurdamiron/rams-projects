/**
 * WiFi Hardware Service
 * Communicates with ESP32 over HTTP instead of Serial
 */

interface HardwareCommand {
    action: 'select_project' | 'reset' | 'screensaver' | 'toggle_element' | 'highlight' | 'off' | 'actuator';
    projectId?: number | string;
    target?: string;
    state?: 'up' | 'down' | boolean;
    elements?: {
        light?: boolean;
        roof?: 'up' | 'down';
        landscape?: boolean;
    };
    data?: Record<string, unknown>;
}

interface HardwareStatus {
    connected: boolean;
    ip?: string;
    lastPing?: number;
}

class WiFiHardwareService {
    private static instance: WiFiHardwareService;
    private espIP: string = '192.168.1.100'; // Default, can be configured
    private isConnected: boolean = false;
    private lastPing: number = 0;
    private pingInterval: NodeJS.Timeout | null = null;
    private isDev: boolean = process.env.NODE_ENV === 'development';
    private failedAttempts: number = 0;
    private maxLoggedFailures: number = 1; // Only log first failure in dev

    // Command queue and debouncing
    private pendingCommand: { command: HardwareCommand; resolve: (value: boolean) => void } | null = null;
    private commandTimeout: NodeJS.Timeout | null = null;
    private lastCommandTime: number = 0;
    private readonly COMMAND_DEBOUNCE_MS: number = 150; // Min time between commands
    private currentProjectId: number | string | null = null;

    private constructor() {
        if (!this.isDev) {
            this.startHealthCheck();
        }
    }

    public static getInstance(): WiFiHardwareService {
        if (!WiFiHardwareService.instance) {
            WiFiHardwareService.instance = new WiFiHardwareService();
        }
        return WiFiHardwareService.instance;
    }

    /**
     * Configure the ESP32 IP address
     */
    public setIP(ip: string): void {
        this.espIP = ip;
        console.log(`[Hardware WiFi] IP set to ${ip}`);
    }

    /**
     * Send a command to the ESP32 with debouncing
     * Prevents command spam when user quickly switches between projects
     */
    public async sendCommand(command: HardwareCommand): Promise<boolean> {
        // In dev mode, silently skip if hardware is not available
        if (this.isDev && this.failedAttempts >= this.maxLoggedFailures) {
            return false;
        }

        // For project-related commands, use debouncing
        if (command.projectId !== undefined) {
            return this.sendDebouncedCommand(command);
        }

        // For other commands (reset, actuator), send immediately
        return this.sendImmediateCommand(command);
    }

    /**
     * Debounced command - cancels previous pending command for same type
     */
    private sendDebouncedCommand(command: HardwareCommand): Promise<boolean> {
        return new Promise((resolve) => {
            // Cancel any pending command
            if (this.commandTimeout) {
                clearTimeout(this.commandTimeout);
                // Resolve previous pending command as cancelled
                if (this.pendingCommand) {
                    this.pendingCommand.resolve(false);
                }
            }

            // If switching to a different project, send "off" to previous first
            if (command.action === 'highlight' &&
                this.currentProjectId !== null &&
                this.currentProjectId !== command.projectId) {
                // Queue the off command for previous project (fire and forget)
                this.sendImmediateCommand({ action: 'off', projectId: this.currentProjectId });
            }

            // Store the new pending command
            this.pendingCommand = { command, resolve };

            // Calculate delay based on time since last command
            const timeSinceLastCommand = Date.now() - this.lastCommandTime;
            const delay = Math.max(0, this.COMMAND_DEBOUNCE_MS - timeSinceLastCommand);

            // Set timeout to execute
            this.commandTimeout = setTimeout(async () => {
                this.pendingCommand = null;
                this.commandTimeout = null;

                const success = await this.sendImmediateCommand(command);

                if (success && command.action === 'highlight') {
                    this.currentProjectId = command.projectId ?? null;
                } else if (command.action === 'off' || command.action === 'reset') {
                    this.currentProjectId = null;
                }

                resolve(success);
            }, delay);
        });
    }

    /**
     * Send command immediately without debouncing
     */
    private async sendImmediateCommand(command: HardwareCommand): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`http://${this.espIP}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            this.lastCommandTime = Date.now();

            if (response.ok) {
                this.isConnected = true;
                this.lastPing = Date.now();
                this.failedAttempts = 0;
                console.log('[Hardware WiFi] Command sent:', command.action, command.projectId ?? '');
                return true;
            } else {
                console.error('[Hardware WiFi] Command failed:', response.status);
                return false;
            }
        } catch (error) {
            this.failedAttempts++;
            this.isConnected = false;

            // Only log once in dev mode to reduce console spam
            if (!this.isDev || this.failedAttempts === 1) {
                if (error instanceof Error && error.name === 'AbortError') {
                    console.warn('[Hardware WiFi] Hardware not available (timeout) - running in dev mode without hardware');
                } else {
                    console.warn('[Hardware WiFi] Hardware not available - running in dev mode without hardware');
                }
            }
            return false;
        }
    }

    /**
     * Ping the ESP32 to check connection
     */
    public async ping(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`http://${this.espIP}/ping`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.isConnected = true;
                this.lastPing = Date.now();
                return true;
            }
            return false;
        } catch {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Start periodic health check
     */
    private startHealthCheck(): void {
        // Ping every 10 seconds
        this.pingInterval = setInterval(() => {
            this.ping();
        }, 10000);
    }

    /**
     * Get current connection status
     */
    public getStatus(): HardwareStatus {
        return {
            connected: this.isConnected,
            ip: this.espIP,
            lastPing: this.lastPing,
        };
    }

    /**
     * Cancel all pending commands
     */
    public cancelPending(): void {
        if (this.commandTimeout) {
            clearTimeout(this.commandTimeout);
            this.commandTimeout = null;
        }
        if (this.pendingCommand) {
            this.pendingCommand.resolve(false);
            this.pendingCommand = null;
        }
    }

    /**
     * Get current active project
     */
    public getCurrentProject(): number | string | null {
        return this.currentProjectId;
    }

    /**
     * Cleanup on shutdown
     */
    public destroy(): void {
        this.cancelPending();
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
    }
}

export default WiFiHardwareService;
