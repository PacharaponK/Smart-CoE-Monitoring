'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const MqttContext = createContext(null);

export function useMqtt() {
  return useContext(MqttContext);
}

export default function MqttProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [latestMessage, setLatestMessage] = useState(null);
  const [deviceData, setDeviceData] = useState({});
  const socketRef = useRef(null);

  const connectMqtt = useCallback(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      console.error('Socket connect error:', error.message);
    });

    socket.on('telemetry', (incoming) => {
      const enriched = {
        DeviceId: incoming?.DeviceId || incoming?.deviceId || 'unknown-device',
        SensorType: incoming?.SensorType || incoming?.sensorType || 'unknown',
        SensorValue: Number(incoming?.SensorValue ?? incoming?.sensorValue ?? incoming?.value ?? 0),
        QualityStatus: Number(incoming?.QualityStatus ?? incoming?.qualityStatus ?? 1),
        topic: incoming?.topic || '',
        receivedAt: incoming?.receivedAt || new Date().toISOString(),
        ...incoming,
      };

      setLatestMessage(enriched);
      setMessages((prev) => [enriched, ...prev].slice(0, 100));

      setDeviceData((prev) => ({
        ...prev,
        [enriched.DeviceId]: enriched,
      }));
    });

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    connectMqtt();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectMqtt]);

  const value = {
    client: socketRef.current,
    isConnected,
    messages,
    latestMessage,
    lastMessageTopic: latestMessage?.topic || null,
    deviceData,
    reconnect: connectMqtt,
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
