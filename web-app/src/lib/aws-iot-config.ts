import { mqtt } from 'aws-iot-device-sdk-v2';

// AWS IoT Configuration
export const IOT_ENDPOINT = "a2bgtu4hk9hwe6-ats.iot.ap-southeast-1.amazonaws.com";
export const IDENTITY_POOL_ID = "ap-southeast-1:24811aac-cdfc-4e68-95c0-cf431614e322";
export const REGION = "ap-southeast-1";
export const TOPIC = "gateway/+/telemetry/aggregated";

// MQTT Client Configuration
export const mqttConfig: mqtt.MqttClientConfig = {
  endpoint: IOT_ENDPOINT,
  region: REGION,
  credentials: {
    identity_pool_id: IDENTITY_POOL_ID,
    role_arn: '', // This will be automatically resolved by the SDK
    role_alias: '', // This will be automatically resolved by the SDK
    provider_name: 'cognito-identity.amazonaws.com'
  },
  client_id: `web-app-${Math.random().toString(16).substr(2, 8)}`,
  clean_session: true,
  keep_alive: 30,
  reconnect_interval: 5,
  mqtt_operation_timeout: 30000
};

export default mqttConfig;
