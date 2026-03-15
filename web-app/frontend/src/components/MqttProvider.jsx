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

  // Initialize from sessionStorage on mount
  useEffect(() => {
    try {
      const savedMessages = sessionStorage.getItem('telemetry_messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
        if (parsed.length > 0) {
          setLatestMessage(parsed[0]);
          // Rebuild deviceData mapping
          const initialDevices = {};
          parsed.forEach(msg => {
            if (!initialDevices[msg.DeviceId]) {
              initialDevices[msg.DeviceId] = msg;
            }
          });
          setDeviceData(initialDevices);
        }
      }
    } catch (e) {
      console.error('[MQTT] Failed to load saved messages:', e);
    }
  }, []);

  // Use a ref for the latest messages to avoid excessive re-renders from persistence logic
  const messagesRef = useRef([]);
  useEffect(() => {
    messagesRef.current = messages;
    
    // Debounced save to sessionStorage
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        sessionStorage.setItem('telemetry_messages', JSON.stringify(messages));
      }
    }, 2000); // Save every 2 seconds if changed
    
    return () => clearTimeout(timer);
  }, [messages]);

  const connectMqtt = useCallback(() => {
    // Smart default: use localhost:4000 in dev, relative in production
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

    if (socketRef.current) {
      console.log('[MQTT] Disconnecting existing socket...');
      socketRef.current.disconnect();
    }

    console.log('[MQTT] Connecting via Socket.io to:', backendUrl || '(same origin)');
    const socket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Allow fallback to polling
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[MQTT] Socket connected successfully!');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('[MQTT] Socket disconnected. Reason:', reason);
    });

    const getMessageKey = (msg) => `${msg.DeviceId}-${msg.Timestamp}-${msg.SensorType}`;

    socket.on('telemetry-history', (history) => {
      console.log(`[MQTT] Received history (${history.length} items)`);
      setMessages((prev) => {
        const combined = [...prev, ...history.map(item => ({
          ...item,
          DeviceId: item?.DeviceId || item?.deviceId || 'unknown-device',
          SensorType: item?.SensorType || item?.sensorType || 'unknown',
          SensorValue: Number(item?.SensorValue ?? item?.sensorValue ?? item?.value ?? 0),
          Timestamp: item?.Timestamp || item?.receivedAt || new Date().toISOString(),
        }))];
        
        const unique = [];
        const seen = new Set();
        
        // Sort by receivedAt descending first so we keep the newest items if duplicates exist
        combined.sort((a, b) => new Date(b.receivedAt || b.Timestamp) - new Date(a.receivedAt || a.Timestamp));

        for (const msg of combined) {
          const key = getMessageKey(msg);
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(msg);
          }
        }
        
        return unique.slice(0, 250);
      });
    });

    socket.on('telemetry', (incoming) => {
      const enriched = {
        ...incoming,
        DeviceId: incoming?.DeviceId || incoming?.deviceId || 'unknown-device',
        SensorType: incoming?.SensorType || incoming?.sensorType || 'unknown',
        SensorValue: Number(incoming?.SensorValue ?? incoming?.sensorValue ?? incoming?.value ?? 0),
        topic: incoming?.topic || '',
        receivedAt: incoming?.receivedAt || new Date().toISOString(),
        Timestamp: incoming?.Timestamp || new Date().toISOString(),
      };

      setLatestMessage(enriched);
      
      setMessages((prev) => {
        const newMessages = [enriched, ...prev];
        const unique = [];
        const seen = new Set();
        
        for (const msg of newMessages) {
          const key = getMessageKey(msg);
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(msg);
          }
        }
        
        return unique.slice(0, 250);
      });

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
