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
      console.log('[MQTT] Disconnecting existing socket...');
      socketRef.current.disconnect();
    }

    console.log('[MQTT] Connecting to backend:', backendUrl);
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
      console.log('[MQTT] Socket connected successfully!');
      console.log('[MQTT] Socket ID:', socket.id);
      console.log('[MQTT] Transport:', socket.io.engine.transport.name);
    });

    socket.on('connect_attempting', () => {
      console.log('[MQTT] Attempting to connect...');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('[MQTT] Socket disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      console.error('[MQTT] Connection error:', {
        message: error.message,
        type: error.type,
        code: error.code,
        fullError: error,
      });
    });

    socket.on('error', (error) => {
      console.error('[MQTT] Socket error:', error);
    });

    socket.on('telemetry', (incoming) => {
      console.log('[MQTT] Received telemetry:', incoming);

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

    socket.on('iotError', (error) => {
      console.error('[MQTT] IoT backend error:', error);
    });

    socket.on('iotStatus', (status) => {
      console.log('[MQTT] IoT status update:', status);
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
