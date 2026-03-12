import { mqtt, auth, iot } from 'aws-iot-device-sdk-v2';
import { TOPIC } from './aws-iot-config';

interface MessageHandler {
  (topic: string, payload: unknown): void;
}

export class AwsIoTClient {
  private client: mqtt.MqttClient | null = null;
  private connection: mqtt.MqttConnection | null = null;
  private messageHandlers: Map<string, MessageHandler> = new Map();

  async connect(): Promise<void> {
    try {
      console.log('Connecting to AWS IoT...');
      
      // Create MQTT client with direct configuration
      this.client = new mqtt.MqttClient();
      
      // Setup connection configuration
      const config = iot.AwsIotMqttConnectionConfigBuilder.new_default_builder();
      config.with_endpoint("a2bgtu4hk9hwe6-ats.iot.ap-southeast-1.amazonaws.com");
      config.with_client_id(`web-app-${Date.now()}`);
      
      const clientConfig = config.build();
      this.connection = this.client.new_connection(clientConfig);

      // Setup connection event handlers
      this.connection.on('connect', () => {
        console.log('Connected to AWS IoT Core');
        this.subscribeToTopics();
      });

      this.connection.on('disconnect', () => {
        console.log('Disconnected from AWS IoT Core');
      });

      this.connection.on('error', (error: Error) => {
        console.error('AWS IoT Connection Error:', error);
      });

      this.connection.on('message', (topic: string, payload: Buffer) => {
        this.handleMessage(topic, payload);
      });

      // Connect to AWS IoT
      await this.connection.connect();
      
    } catch (error) {
      console.error('Failed to connect to AWS IoT:', error);
      throw error;
    }
  }

  private async subscribeToTopics(): Promise<void> {
    if (!this.connection) return;

    try {
      // Subscribe to the telemetry topic with wildcard
      await this.connection.subscribe(TOPIC, mqtt.QoS.AtLeastOnce);
      console.log(`Subscribed to topic: ${TOPIC}`);
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);
    }
  }

  private handleMessage(topic: string, payload: any): void {
    try {
      const message = JSON.parse(payload.toString());
      
      // Call registered message handlers
      this.messageHandlers.forEach((handler, key) => {
        handler(topic, message);
      });
      
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  onMessage(key: string, handler: (topic: string, payload: any) => void): void {
    this.messageHandlers.set(key, handler);
  }

  removeMessageHandler(key: string): void {
    this.messageHandlers.delete(key);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
    if (this.client) {
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}

// Singleton instance
export const awsIoTClient = new AwsIoTClient();
export default awsIoTClient;
