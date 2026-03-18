/**
 * gateway-one/main.js — Primary MQTT Edge Gateway → AWS IoT Core
 * * Flow:
 * [Sensor Boards] --MQTT--> [This Gateway] --edge computing--> [AWS IoT Core]
 */

require('dotenv').config();
const mqtt = require('mqtt');
const awsIot = require('aws-iot-device-sdk');

// ── Environment & Config ──────────────────────────────────────────────────
const AWS_ENDPOINT = process.env.AWS_ENDPOINT;
const AWS_CLIENT_ID = process.env.AWS_CLIENT_ID || 'gateway-one-sdk';
const AWS_CA_FILE = process.env.AWS_CA_FILE || 'secrets/root-CA.crt';
const AWS_CERT_FILE = process.env.AWS_CERT_FILE || 'secrets/gateway.cert.pem';
const AWS_KEY_FILE = process.env.AWS_KEY_FILE || 'secrets/gateway.private.key';
const GATEWAY_ID = process.env.GATEWAY_ID || 'gateway-one';
const AWS_PUBLISH_TOPIC = process.env.AWS_PUBLISH_TOPIC || `gateway/${GATEWAY_ID}/telemetry/aggregated`;
const GATEWAY_ROLE = (process.env.GATEWAY_ROLE || 'primary').toLowerCase();
const PRIMARY_GATEWAY_ID = process.env.PRIMARY_GATEWAY_ID || 'gateway-one';

const MQTT_BROKER_HOST = process.env.MQTT_BROKER_HOST || 'localhost';
const MQTT_BROKER_PORT = parseInt(process.env.MQTT_BROKER_PORT || '1883', 10);
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || `mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT}`;
const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'sensors';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || GATEWAY_ID;
const MQTT_FALLBACK_BROKER_URL = process.env.MQTT_FALLBACK_BROKER_URL || '';
const MQTT_FALLBACK_USERNAME = process.env.MQTT_FALLBACK_USERNAME || '';
const MQTT_FALLBACK_PASSWORD = process.env.MQTT_FALLBACK_PASSWORD || '';
const MQTT_RECONNECT_DELAY_MS = parseInt(process.env.MQTT_RECONNECT_DELAY_MS || '3000', 10);
const MQTT_CONNECT_TIMEOUT_MS = parseInt(process.env.MQTT_CONNECT_TIMEOUT_MS || '10000', 10);
const MQTT_PRIMARY_RETRY_MS = parseInt(process.env.MQTT_PRIMARY_RETRY_MS || '30000', 10);

const ROOMS = (process.env.ROOMS || 'R200,R201,COE,AIE,NETWORK,R302')
    .split(',')
    .map(r => r.trim())
    .filter(r => r);

const SEND_INTERVAL_MS = parseInt(process.env.SEND_INTERVAL || '10', 10) * 1000;
const HEARTBEAT_TOPIC = process.env.HEARTBEAT_TOPIC || 'gateway/primary/heartbeat';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '1000', 10);
const FAILOVER_TIMEOUT_MS = parseInt(process.env.FAILOVER_TIMEOUT_MS || '2500', 10);

const SENSOR_RANGES = {
    temperature: [-40.0, 85.0], // °C
    humidity: [0.0, 100.0]      // %RH
};

// ── Edge Computing State ──────────────────────────────────────────────────
// เก็บข้อมูลเป็น object เช่น { "R201|temperature": [25.5, 25.6], "COE|humidity": [60, 61] }
let intervalBuffer = {};
let hasReceivedRealData = false;
let waitingLogShown = false;
let standbyLogShown = false;
let awsNotReadyLogShown = false;
let isActive = GATEWAY_ROLE === 'primary';
let lastPrimaryHeartbeatAt = 0;
let awsClient = null;
let awsConnected = false;
let localClient = null;
let localMqttConnected = false;
let mqttReconnectTimer = null;
let mqttPrimaryRetryTimer = null;
let mqttPrimaryProbeInFlight = false;
let currentBrokerIndex = 0;

const mqttBrokers = [
    {
        name: 'primary',
        url: MQTT_BROKER_URL,
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD
    }
];

if (MQTT_FALLBACK_BROKER_URL) {
    mqttBrokers.push({
        name: 'fallback',
        url: MQTT_FALLBACK_BROKER_URL,
        username: MQTT_FALLBACK_USERNAME,
        password: MQTT_FALLBACK_PASSWORD
    });
}

function getQualityStatus(sensorType, value) {
    if (SENSOR_RANGES[sensorType]) {
        const [lo, hi] = SENSOR_RANGES[sensorType];
        return (value >= lo && value <= hi) ? 1 : 0;
    }
    return 1; // unknown sensor type → assume good
}

function normalizeIsAlert(rawIsAlert) {
    if (rawIsAlert === undefined || rawIsAlert === null) {
        return { value: 0, reason: '' };
    }

    if (typeof rawIsAlert === 'object') {
        const normalizedValue = (Number(rawIsAlert.value) === 1 || rawIsAlert.value === true) ? 1 : 0;
        const normalizedReason = typeof rawIsAlert.reason === 'string' ? rawIsAlert.reason : '';
        return { value: normalizedValue, reason: normalizedReason };
    }

    const normalizedValue = (Number(rawIsAlert) === 1 || rawIsAlert === true || rawIsAlert === 'true') ? 1 : 0;
    return { value: normalizedValue, reason: '' };
}

// ── AWS IoT Core Setup ────────────────────────────────────────────────────
function ensureAwsConnected() {
    if (awsClient) {
        return;
    }

    console.log('[AWS] Connecting to IoT Core...');
    awsClient = awsIot.device({
        keyPath: AWS_KEY_FILE,
        certPath: AWS_CERT_FILE,
        caPath: AWS_CA_FILE,
        clientId: AWS_CLIENT_ID,
        host: AWS_ENDPOINT
    });

    awsClient.on('connect', () => {
        awsConnected = true;
        awsNotReadyLogShown = false;
        console.log('[AWS] Connected.\n');
    });
    awsClient.on('error', (err) => console.log('[AWS] Error:', err));
    awsClient.on('offline', () => {
        awsConnected = false;
        console.log('[AWS] Offline.');
    });
    awsClient.on('close', () => {
        awsConnected = false;
        console.log('[AWS] Connection closed.');
    });
    awsClient.on('reconnect', () => console.log('[AWS] Reconnecting...'));
}

function shutdownAwsConnection() {
    if (!awsClient) {
        return;
    }

    awsClient.end();
    awsClient = null;
    awsConnected = false;
}

if (GATEWAY_ROLE === 'primary') {
    ensureAwsConnected();
} else {
    console.log('[AWS] Secondary standby mode: AWS connection will start only when failover is activated.');
}

// ── Local MQTT Setup (Sensor to Gateway) ──────────────────────────────────
function createLocalWill() {
    if (GATEWAY_ROLE !== 'primary') {
        return undefined;
    }

    return {
        topic: HEARTBEAT_TOPIC,
        payload: JSON.stringify({
            gatewayId: GATEWAY_ID,
            role: GATEWAY_ROLE,
            status: 'offline',
            ts: Date.now()
        }),
        qos: 1,
        retain: true
    };
}

function getMqttClientId(brokerName) {
    return `${MQTT_CLIENT_ID}-${brokerName}`;
}

function getMqttOptions(brokerName, username, password) {
    return {
        clientId: getMqttClientId(brokerName),
        clean: true,
        username: username || undefined,
        password: password || undefined,
        keepalive: 60,
        connectTimeout: MQTT_CONNECT_TIMEOUT_MS,
        reconnectPeriod: 0,
        will: createLocalWill()
    };
}

function subscribeToGatewayTopics(client) {
    ROOMS.forEach(room => {
        const topic = `${MQTT_TOPIC_PREFIX}/${room}/#`;
        client.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
                console.log(`[Local MQTT] Subscribe failed for '${topic}': ${err.message || err}`);
                return;
            }
            console.log(`[Local MQTT] Subscribed to '${topic}'`);
        });
    });

    client.subscribe(HEARTBEAT_TOPIC, { qos: 1 }, (err) => {
        if (err) {
            console.log(`[Local MQTT] Subscribe failed for '${HEARTBEAT_TOPIC}': ${err.message || err}`);
            return;
        }
        console.log(`[Local MQTT] Subscribed to '${HEARTBEAT_TOPIC}'`);
    });
}

function clearMqttReconnectTimer() {
    if (!mqttReconnectTimer) {
        return;
    }
    clearTimeout(mqttReconnectTimer);
    mqttReconnectTimer = null;
}

function stopPrimaryBrokerMonitor() {
    if (mqttPrimaryRetryTimer) {
        clearInterval(mqttPrimaryRetryTimer);
        mqttPrimaryRetryTimer = null;
    }
}

function scheduleMqttReconnect(nextBrokerIndex, reason) {
    const targetBroker = mqttBrokers[nextBrokerIndex];
    if (!targetBroker) {
        return;
    }

    if (mqttReconnectTimer) {
        return;
    }

    console.log(`[Local MQTT] Switching to ${targetBroker.name} broker in ${MQTT_RECONNECT_DELAY_MS}ms (${reason}).`);
    mqttReconnectTimer = setTimeout(() => {
        mqttReconnectTimer = null;
        connectLocalMqtt(nextBrokerIndex, reason);
    }, MQTT_RECONNECT_DELAY_MS);
}

function getNextBrokerIndex(disconnectedBrokerIndex) {
    if (mqttBrokers.length === 1) {
        return 0;
    }
    return disconnectedBrokerIndex === 0 ? 1 : 0;
}

function startPrimaryBrokerMonitor() {
    if (mqttBrokers.length < 2 || currentBrokerIndex === 0 || mqttPrimaryRetryTimer) {
        return;
    }

    mqttPrimaryRetryTimer = setInterval(() => {
        if (!localMqttConnected || currentBrokerIndex === 0 || mqttPrimaryProbeInFlight) {
            return;
        }

        const primaryBroker = mqttBrokers[0];
        mqttPrimaryProbeInFlight = true;
        console.log('[Local MQTT] Probing primary broker to switch back from fallback...');

        const probeClient = mqtt.connect(
            primaryBroker.url,
            getMqttOptions('primary-probe', primaryBroker.username, primaryBroker.password)
        );

        const finishProbe = () => {
            mqttPrimaryProbeInFlight = false;
            probeClient.removeAllListeners();
            probeClient.end(true);
        };

        probeClient.on('connect', () => {
            console.log('[Local MQTT] Primary broker is reachable again. Returning to primary broker.');
            finishProbe();
            connectLocalMqtt(0, 'primary broker recovered');
        });

        probeClient.on('error', () => {
            finishProbe();
        });

        probeClient.on('close', () => {
            mqttPrimaryProbeInFlight = false;
        });
    }, MQTT_PRIMARY_RETRY_MS);
}

function handleLocalMqttMessage(topic, message) {
    if (topic === HEARTBEAT_TOPIC) {
        handleHeartbeat(message.toString());
        return;
    }

    if (!isActive) {
        if (!standbyLogShown) {
            console.log('[HA]      Standby mode: suppressing sensor forwarding.');
            standbyLogShown = true;
        }
        return;
    }

    try {
        const payload = JSON.parse(message.toString());
        const topicParts = topic.split('/');

        const deviceId = payload.deviceId || (topicParts.length > 1 ? topicParts[1] : 'unknown');
        const sensorType = payload.sensorType || (topicParts.length > 2 ? topicParts[2] : 'unknown');
        const raw = payload.value !== undefined ? payload.value : payload.sensorValue;

        if (raw === undefined || raw === null) {
            console.log(`[Local MQTT] Missing 'value'/'sensorValue' in:`, payload);
            return;
        }

        const rawValue = parseFloat(raw);
        if (isNaN(rawValue)) {
            console.log(`[Local MQTT] Non-numeric value '${raw}' from topic '${topic}'`);
            return;
        }

        if (!hasReceivedRealData) {
            hasReceivedRealData = true;
            console.log('[Gateway] First real sensor data received. Forwarding loop is now active.');
        }

        const bufferKey = `${deviceId}|${sensorType}`;
        const isAlert = normalizeIsAlert(payload.isAlert !== undefined ? payload.isAlert : payload.IsAlert);

        if (!intervalBuffer[bufferKey]) {
            intervalBuffer[bufferKey] = [];
        }
        intervalBuffer[bufferKey].push({ value: rawValue, isAlert });

        console.log(`[Local MQTT] ${deviceId}/${sensorType}  raw=${rawValue}  isAlert=${isAlert.value}${isAlert.reason ? ` (${isAlert.reason})` : ''}`);
    } catch (err) {
        console.log(`[Local MQTT] Bad payload on '${topic}': ${err.message}`);
    }
}

function connectLocalMqtt(brokerIndex = 0, reason = 'startup') {
    clearMqttReconnectTimer();
    stopPrimaryBrokerMonitor();

    const broker = mqttBrokers[brokerIndex];
    currentBrokerIndex = brokerIndex;

    if (localClient) {
        localClient.removeAllListeners();
        localClient.end(true);
        localClient = null;
    }

    console.log(`[Local MQTT] Connecting to ${broker.name} broker ${broker.url} (${reason}) ...`);
    const client = mqtt.connect(broker.url, getMqttOptions(broker.name, broker.username, broker.password));
    localClient = client;

    client.on('connect', () => {
        if (localClient !== client) {
            client.end(true);
            return;
        }

        localMqttConnected = true;
        subscribeToGatewayTopics(client);

        if (brokerIndex === 0) {
            console.log('[Local MQTT] Primary broker is active.');
        } else {
            console.log('[Local MQTT] Fallback broker is active.');
            startPrimaryBrokerMonitor();
        }

        if (GATEWAY_ROLE === 'primary') {
            console.log(`[HA]      Role=PRIMARY (${GATEWAY_ID}) -> ACTIVE`);
        } else {
            console.log(`[HA]      Role=SECONDARY (${GATEWAY_ID}) -> STANDBY, monitoring '${PRIMARY_GATEWAY_ID}'`);
        }

        console.log(`\n[Gateway] Running. Forwarding to AWS every ${SEND_INTERVAL_MS / 1000}s.`);
        console.log(`[Gateway] AWS Target Topic: '${AWS_PUBLISH_TOPIC}'`);
        console.log(`[HA]      Heartbeat topic: '${HEARTBEAT_TOPIC}'\n`);
    });

    client.on('message', handleLocalMqttMessage);

    client.on('error', (err) => {
        if (localClient !== client) {
            return;
        }
        console.log(`[Local MQTT] ${broker.name} broker error: ${err.message || err}`);
    });

    client.on('offline', () => {
        if (localClient !== client) {
            return;
        }
        localMqttConnected = false;
        console.log(`[Local MQTT] ${broker.name} broker went offline.`);
    });

    client.on('close', () => {
        if (localClient !== client) {
            return;
        }

        localMqttConnected = false;
        stopPrimaryBrokerMonitor();
        console.log(`[Local MQTT] ${broker.name} broker connection closed.`);
        scheduleMqttReconnect(getNextBrokerIndex(brokerIndex), `${broker.name} broker unavailable`);
    });
}

function shutdownLocalMqttConnection() {
    clearMqttReconnectTimer();
    stopPrimaryBrokerMonitor();

    if (!localClient) {
        return;
    }

    localClient.removeAllListeners();
    localClient.end(true);
    localClient = null;
    localMqttConnected = false;
}

connectLocalMqtt(0, 'startup');

function publishPrimaryHeartbeat(status) {
    if (GATEWAY_ROLE !== 'primary' || !localClient || !localMqttConnected) {
        return;
    }

    const hb = JSON.stringify({
        gatewayId: GATEWAY_ID,
        role: GATEWAY_ROLE,
        status,
        ts: Date.now()
    });
    localClient.publish(HEARTBEAT_TOPIC, hb, { qos: 1, retain: true });
}

function activateSecondary() {
    if (GATEWAY_ROLE !== 'secondary' || isActive) {
        return;
    }
    isActive = true;
    ensureAwsConnected();
    standbyLogShown = false;
    waitingLogShown = false;
    console.log(`[HA]      Primary heartbeat missing > ${FAILOVER_TIMEOUT_MS}ms. Secondary is ACTIVE now.`);
}

function demoteSecondary() {
    if (GATEWAY_ROLE !== 'secondary' || !isActive) {
        return;
    }
    isActive = false;
    intervalBuffer = {};
    hasReceivedRealData = false;
    waitingLogShown = false;
    standbyLogShown = false;
    awsNotReadyLogShown = false;
    shutdownAwsConnection();
    console.log('[HA]      Primary is back UP. Secondary returns to STANDBY immediately.');
}

function handleHeartbeat(payloadText) {
    let hb;
    try {
        hb = JSON.parse(payloadText);
    } catch {
        hb = {
            gatewayId: PRIMARY_GATEWAY_ID,
            role: 'primary',
            status: payloadText,
            ts: Date.now()
        };
    }

    if (hb.gatewayId === PRIMARY_GATEWAY_ID && hb.status === 'alive') {
        lastPrimaryHeartbeatAt = Date.now();
        if (GATEWAY_ROLE === 'secondary') {
            demoteSecondary();
        }
        return;
    }

    if (hb.gatewayId === PRIMARY_GATEWAY_ID && hb.status === 'offline' && GATEWAY_ROLE === 'secondary') {
        activateSecondary();
    }
}

if (GATEWAY_ROLE === 'secondary') {
    setInterval(() => {
        const msSincePrimary = Date.now() - lastPrimaryHeartbeatAt;
        if (!isActive && msSincePrimary > FAILOVER_TIMEOUT_MS) {
            activateSecondary();
        }
    }, 200);
}

setInterval(() => {
    publishPrimaryHeartbeat('alive');
}, HEARTBEAT_INTERVAL_MS);

// ── Gateway Forwarding Logic (Interval) ───────────────────────────────────
setInterval(() => {
    if (!isActive) {
        return;
    }

    if (!awsClient || !awsConnected) {
        if (!awsNotReadyLogShown) {
            console.log('[AWS] Waiting for AWS IoT connection before forwarding...');
            awsNotReadyLogShown = true;
        }
        return;
    }

    if (!hasReceivedRealData) {
        if (!waitingLogShown) {
            console.log('[Gateway] Waiting for real sensor data before forwarding to AWS...');
            waitingLogShown = true;
        }
        return;
    }

    // 1. Snapshot ข้อมูลแล้วล้าง Buffer อย่างรวดเร็ว
    const snapshot = intervalBuffer;
    intervalBuffer = {}; 

    const keys = Object.keys(snapshot);
    if (keys.length > 0) {
        const now = new Date().toISOString();
        let sent = 0;

        keys.forEach(key => {
            const [deviceId, sensorType] = key.split('|');
            const readings = snapshot[key];
            
            // 2. คำนวณค่าเฉลี่ย
            const sum = readings.reduce((a, b) => a + b.value, 0);
            const avg = Number((sum / readings.length).toFixed(4));
            const quality = getQualityStatus(sensorType, avg);
            const latestAlert = [...readings].reverse().find(r => r.isAlert && r.isAlert.value === 1);
            const aggregatedIsAlert = {
                value: latestAlert ? 1 : 0,
                reason: latestAlert && latestAlert.isAlert.reason ? latestAlert.isAlert.reason : ''
            };

            // 3. สร้าง Payload ส่งขึ้น Cloud
            const cloudPayload = {
                DeviceId: deviceId,
                SensorType: sensorType,
                SensorValue: avg,
                IsAlert: aggregatedIsAlert,
                QualityStatus: quality,
                CreatedAt: now
            };

            // 4. Publish ขึ้น AWS IoT Core
            awsClient.publish(AWS_PUBLISH_TOPIC, JSON.stringify(cloudPayload), { qos: 1 }, (err) => {
                if (err) {
                    console.log(`[AWS] Publish failed for ${deviceId}/${sensorType}:`, err.message || err);
                }
            });
            sent++;
            
            console.log(`[AWS] ↑ ${deviceId}/${sensorType}  avg=${avg} (n=${readings.length})  quality=${quality ? 'Good' : 'Bad'}  isAlert=${aggregatedIsAlert.value}${aggregatedIsAlert.reason ? ` (${aggregatedIsAlert.reason})` : ''}`);
        });

        console.log(`[AWS] Flushed ${sent} message(s). Buffer cleared.\n` + '-'.repeat(50));
    }

}, SEND_INTERVAL_MS);

// ── Graceful Shutdown ─────────────────────────────────────────────────────
process.on('SIGINT', () => {
    console.log('\n[Gateway] Stopped by user.');
    if (GATEWAY_ROLE === 'primary') {
        publishPrimaryHeartbeat('offline');
    }
    shutdownLocalMqttConnection();
    shutdownAwsConnection();
    process.exit(0);
});