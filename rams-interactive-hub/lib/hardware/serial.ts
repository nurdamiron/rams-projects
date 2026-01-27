import { SerialPort } from 'serialport';

type SerialCommand = {
  projectId?: number;
  action: 'highlight' | 'reset' | 'screensaver' | 'off';
  data?: any;
};

class SerialService {
  private static instance: SerialService;
  private port: SerialPort | null = null;
  private queue: SerialCommand[] = [];
  private isProcessing = false;
  private isConnected = false;
  private reconnectInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.connect();
  }

  public static getInstance(): SerialService {
    if (!SerialService.instance) {
      SerialService.instance = new SerialService();
    }
    return SerialService.instance;
  }

  private async connect() {
    if (this.isConnected) return;

    try {
      const ports = await SerialPort.list();
      // Filter for common Arduino/ESP32 USB serial names on Mac
      const arduinoPort = ports.find(
        (p) =>
          p.path.includes('usb') ||
          p.path.includes('usbmodem') ||
          p.path.includes('wchusb')
      );

      if (arduinoPort) {
        console.log(`[Hardware] Found device at ${arduinoPort.path}`);
        this.port = new SerialPort({
          path: arduinoPort.path,
          baudRate: 115200, // Standard baud rate for ESP32/Arduino
          autoOpen: false,
        });

        this.port.open((err) => {
          if (err) {
            console.error('[Hardware] Error opening port:', err.message);
            this.scheduleReconnect();
          } else {
            console.log('[Hardware] Connected successfully');
            this.isConnected = true;
            if (this.reconnectInterval) clearInterval(this.reconnectInterval);
            this.processQueue();
          }
        });

        this.port.on('close', () => {
          console.warn('[Hardware] Port closed');
          this.isConnected = false;
          this.port = null;
          this.scheduleReconnect();
        });

        this.port.on('error', (err) => {
            console.error('[Hardware] Port error:', err.message);
            this.isConnected = false;
        });

      } else {
        console.log('[Hardware] No device found, retrying...');
        this.scheduleReconnect();
      }
    } catch (err) {
      console.error('[Hardware] Connection error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) return;
    this.reconnectInterval = setInterval(() => {
      this.connect();
    }, 5000); // Retry every 5 seconds
  }

  public async sendCommand(command: SerialCommand) {
    this.queue.push(command);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || !this.isConnected || !this.port || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const command = this.queue.shift();

    if (command) {
      const jsonCommand = JSON.stringify(command) + '\n';
      this.port.write(jsonCommand, (err) => {
        if (err) {
          console.error('[Hardware] Write error:', err.message);
          // Optionally requeue if critical
        } else {
           // console.log('[Hardware] Sent:', jsonCommand.trim());
        }
        // Small delay to prevent flooding
        setTimeout(() => {
            this.isProcessing = false;
            this.processQueue();
        }, 50); 
      });
    } else {
        this.isProcessing = false;
    }
  }

  public getStatus() {
      return { connected: this.isConnected };
  }
}

export default SerialService;
