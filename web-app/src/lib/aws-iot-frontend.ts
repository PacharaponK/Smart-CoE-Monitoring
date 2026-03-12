'use client';

import { io, Socket } from 'socket.io-client';

interface SensorData {
  DeviceId: string;
  SensorType: string;
  SensorValue: number;
  Timestamp: string;
  QualityStatus?: number;
}

class AwsIoTFrontend {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, (data: SensorData) => void> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io();

    this.socket.on('connect', () => {
      console.log('Connected to server via Socket.IO');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('sensorData', (data: SensorData) => {
      // Broadcast to all registered handlers
      this.messageHandlers.forEach((handler) => {
        handler(data);
      });
    });
  }

  onMessage(key: string, handler: (data: SensorData) => void): void {
    this.messageHandlers.set(key, handler);
  }

  removeMessageHandler(key: string): void {
    this.messageHandlers.delete(key);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const awsIoTFrontend = new AwsIoTFrontend();
export default awsIoTFrontend;
