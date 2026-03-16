const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const awsIot = require("aws-iot-device-sdk");
const axios = require("axios");
const dotenv = require("dotenv");
const { log } = require("console");

loadEnvironment();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const ALLOWED_ORIGINS = FRONTEND_ORIGIN.split(",").map((o) => o.trim());
if (
  ALLOWED_ORIGINS.includes("http://localhost:3000") &&
  !ALLOWED_ORIGINS.includes("http://127.0.0.1:3000")
) {
  ALLOWED_ORIGINS.push("http://127.0.0.1:3000");
}

const API_GATEWAY_URL =
  process.env.API_GATEWAY_URL ||
  "https://6g6lrcsukg.execute-api.ap-southeast-1.amazonaws.com";
const API_ENDPOINT = process.env.API_ENDPOINT || "sensors";
const IOT_ENDPOINT = process.env.AWS_IOT_ENDPOINT;
const IOT_TOPIC = process.env.AWS_IOT_TOPIC || "gateway/+/telemetry/aggregated";
const IOT_TOPICS = process.env.AWS_IOT_TOPICS
  ? process.env.AWS_IOT_TOPICS.split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  : [IOT_TOPIC];
const IOT_CLIENT_ID =
  process.env.AWS_IOT_CLIENT_ID || `iot-dashboard-proxy-${Date.now()}`;

const certPath = resolvePath(process.env.PATH_TO_CERT);
const keyPath = resolvePath(process.env.PATH_TO_KEY);
const caPath = resolvePath(process.env.PATH_TO_ROOT_CA);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.includes("*") ? true : ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
});

let latestTelemetry = null;
const telemetryBuffer = [];
const MAX_BUFFER_SIZE = 200;
let socketClientCount = 0;
let iotConnected = false;
const SENSOR_ROOMS = [
  "R200",
  "R201",
  "R302",
  "R303",
  "COE",
  "AIE",
  "Co_Ai",
  "NETWORK",
];
const SENSOR_FETCH_ROOM_CHUNK_SIZE = Math.max(
  1,
  Number(process.env.SENSOR_FETCH_ROOM_CHUNK_SIZE || 3),
);
const SENSOR_FETCH_MAX_LIMIT = Math.max(
  100000,
  Number(process.env.SENSOR_FETCH_MAX_LIMIT || 100000),
);
const SENSOR_FETCH_PAGE_SIZE = Math.max(
  100,
  Number(process.env.SENSOR_FETCH_PAGE_SIZE || 500),
);
const SENSOR_FETCH_ALL_MAX_ITEMS = Math.max(
  5000,
  Number(process.env.SENSOR_FETCH_ALL_MAX_ITEMS || 200000),
);
const SENSOR_FETCH_ALL_MAX_PAGES = Math.max(
  10,
  Number(process.env.SENSOR_FETCH_ALL_MAX_PAGES || 400),
);

const normalizeLimit = (value, fallback = 5000) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, SENSOR_FETCH_MAX_LIMIT);
};

const chunkArray = (items, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const normalizeGatewayPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      lastKey: null,
      count: payload.length,
    };
  }

  if (payload?.items && Array.isArray(payload.items)) {
    return {
      items: payload.items,
      lastKey: payload.lastKey || null,
      count: payload.count || payload.items.length,
    };
  }

  const items = payload ? [payload] : [];
  return {
    items,
    lastKey: null,
    count: items.length,
  };
};

const toBoolean = (value) => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const encodeLastKey = (lastKey) => {
  if (!lastKey) return undefined;
  return typeof lastKey === "string" ? lastKey : JSON.stringify(lastKey);
};

const fetchAllFromGateway = async (apiUrl, baseParams, options = {}) => {
  const {
    pageSize = SENSOR_FETCH_PAGE_SIZE,
    maxItems = SENSOR_FETCH_ALL_MAX_ITEMS,
    maxPages = SENSOR_FETCH_ALL_MAX_PAGES,
  } = options;

  let items = [];
  let nextLastKey = null;
  let page = 0;
  let prevLastKey = null;

  do {
    const params = {
      ...baseParams,
      limit: pageSize,
    };
    const encodedLastKey = encodeLastKey(nextLastKey);
    if (encodedLastKey) {
      params.lastKey = encodedLastKey;
    }

    const response = await axios.get(apiUrl, { params });
    const normalized = normalizeGatewayPayload(response.data);
    const batch = normalized.items || [];
    items = items.concat(batch);

    prevLastKey = nextLastKey;
    nextLastKey = normalized.lastKey || null;
    page += 1;

    if (items.length >= maxItems) break;
    if (page >= maxPages) break;
    if (!nextLastKey) break;
    if (JSON.stringify(prevLastKey) === JSON.stringify(nextLastKey)) break;
  } while (true);

  return {
    items,
    lastKey: nextLastKey,
    pages: page,
  };
};

const toEpochMs = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    return numeric > 1e12 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const applyTimeFilter = (items, startTime, endTime) => {
  const startMs = toEpochMs(startTime);
  const endMs = toEpochMs(endTime);

  if (startMs === null && endMs === null) {
    return items;
  }

  return items.filter((item) => {
    const ts = toEpochMs(item?.Timestamp ?? item?.timestamp);
    if (ts === null) return false;
    if (startMs !== null && ts < startMs) return false;
    if (endMs !== null && ts > endMs) return false;
    return true;
  });
};

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    iotConnected,
    socketClientCount,
    topics: IOT_TOPICS,
    latestTelemetry,
    bufferSize: telemetryBuffer.length,
  });
});

app.get("/api/realtime/history", (req, res) => {
  res.json({ items: telemetryBuffer });
});

app.get("/api/realtime/latest", (req, res) => {
  res.json({ item: latestTelemetry });
});

app.get("/api/sensor-data", async (req, res) => {
  try {
    const { deviceId, sensorType, startTime, endTime, limit, room, lastKey } =
      req.query;
    const fetchAll = toBoolean(req.query.fetchAll);
    const apiLimit = normalizeLimit(limit, 5000);
    const apiUrl = `${API_GATEWAY_URL}/${API_ENDPOINT}`;

    if (deviceId || room || lastKey) {
      const params = {};
      if (deviceId) {
        params.deviceId = deviceId;
        params.DeviceId = deviceId;
      }
      if (sensorType) {
        params.sensorType = sensorType;
        params.SensorType = sensorType;
      }
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      params.limit = apiLimit;
      if (room) {
        params.room = room;
        params.Room = room;
      }
      if (lastKey) params.lastKey = lastKey;

      const normalized = fetchAll
        ? await fetchAllFromGateway(apiUrl, params, {
            maxItems: Math.min(apiLimit, SENSOR_FETCH_ALL_MAX_ITEMS),
          })
        : normalizeGatewayPayload((await axios.get(apiUrl, { params })).data);

      const filteredItems = applyTimeFilter(
        normalized.items || [],
        startTime,
        endTime,
      );
      return res.json({
        ...normalized,
        items: filteredItems,
        count: filteredItems.length,
        fetchAll,
      });
    }

    if (fetchAll) {
      const roomPromises = SENSOR_ROOMS.map((roomName) => {
        const params = {};
        params.room = roomName;
        params.Room = roomName;
        if (sensorType) {
          params.sensorType = sensorType;
          params.SensorType = sensorType;
        }
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;

        return fetchAllFromGateway(apiUrl, params, {
          maxItems:
            Math.ceil(
              Math.min(apiLimit, SENSOR_FETCH_ALL_MAX_ITEMS) /
                SENSOR_ROOMS.length,
            ) + SENSOR_FETCH_PAGE_SIZE,
        });
      });

      const settledAll = await Promise.allSettled(roomPromises);
      const successfulAll = settledAll.filter(
        (result) => result.status === "fulfilled",
      );
      if (successfulAll.length === 0) {
        throw new Error("All fetchAll room requests failed");
      }

      const mergedAll = successfulAll
        .map((result) => result.value.items || [])
        .flat();
      const filteredAll = applyTimeFilter(mergedAll, startTime, endTime)
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
        .slice(0, apiLimit);

      return res.json({
        items: filteredAll,
        lastKey: null,
        count: filteredAll.length,
        partial: successfulAll.length < settledAll.length,
        fetchAll: true,
      });
    }

    const roomChunks = chunkArray(SENSOR_ROOMS, SENSOR_FETCH_ROOM_CHUNK_SIZE);
    const perChunkLimit = Math.max(
      50,
      Math.ceil(apiLimit / Math.max(roomChunks.length, 1)) + 20,
    );

    const requestPromises = roomChunks.map((chunk) => {
      const params = {
        limit: perChunkLimit,
        rooms: chunk.join(","),
      };

      if (sensorType) {
        params.sensorType = sensorType;
        params.SensorType = sensorType;
      }
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      return axios.get(apiUrl, { params });
    });

    const settled = await Promise.allSettled(requestPromises);
    const successful = settled.filter(
      (result) => result.status === "fulfilled",
    );

    if (successful.length === 0) {
      throw new Error("All chunked sensor-data requests failed");
    }

    const items = successful
      .map((result) => normalizeGatewayPayload(result.value.data).items)
      .flat();

    const filteredItems = applyTimeFilter(items, startTime, endTime);

    filteredItems.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    const slicedItems = filteredItems.slice(0, apiLimit);

    return res.json({
      items: slicedItems,
      lastKey: null,
      count: slicedItems.length,
      partial: successful.length < settled.length,
    });
  } catch (error) {
    console.error("[Backend] /api/sensor-data error:", error.message);
    if (error.response) {
      console.error(
        "[Backend] API Gateway response status:",
        error.response.status,
      );
      console.error(
        "[Backend] API Gateway response data:",
        error.response.data,
      );
    }
    res
      .status(500)
      .json({ error: "Failed to fetch sensor data from API Gateway" });
  }
});

io.on("connection", (socket) => {
  socketClientCount += 1;
  console.log(
    `[Socket] client connected: ${socket.id} (total=${socketClientCount})`,
  );
  console.log(`[Socket] Connection details:`, {
    transport: socket.conn.transport.name,
    address: socket.handshake?.address,
    userAgent: socket.handshake?.headers["user-agent"]?.substring(0, 50),
  });

  if (telemetryBuffer.length > 0) {
    console.log(
      `[Socket] Sending telemetry history (${telemetryBuffer.length} items) to ${socket.id}`,
    );
    socket.emit("telemetry-history", telemetryBuffer);
  } else if (latestTelemetry) {
    socket.emit("telemetry", latestTelemetry);
  }

  socket.on("disconnect", () => {
    socketClientCount = Math.max(socketClientCount - 1, 0);
    console.log(
      `[Socket] client disconnected: ${socket.id} (total=${socketClientCount})`,
    );
  });

  socket.on("error", (error) => {
    console.error(`[Socket] Error from client ${socket.id}:`, error);
  });
});

if (!IOT_ENDPOINT || !certPath || !keyPath || !caPath) {
  console.warn(
    "[IoT] Missing AWS IoT mTLS config. Set AWS_IOT_ENDPOINT, PATH_TO_CERT, PATH_TO_KEY, PATH_TO_ROOT_CA in backend/.env",
  );
} else if (!existsAll([certPath, keyPath, caPath])) {
  console.warn("[IoT] Certificate file not found. Check backend/.env paths.");
  console.warn("[IoT] cert=", certPath);
  console.warn("[IoT] key =", keyPath);
  console.warn("[IoT] ca  =", caPath);
} else {
  console.log("[IoT] Starting connection...");
  console.log("[IoT] endpoint  :", IOT_ENDPOINT);
  console.log("[IoT] clientId  :", IOT_CLIENT_ID);
  console.log("[IoT] certPath  :", certPath);
  console.log("[IoT] keyPath   :", keyPath);
  console.log("[IoT] caPath    :", caPath);
  console.log("[IoT] certExists:", fs.existsSync(certPath));
  console.log("[IoT] keyExists :", fs.existsSync(keyPath));
  console.log("[IoT] caExists  :", fs.existsSync(caPath));

  const iotDevice = awsIot.device({
    host: IOT_ENDPOINT,
    clientId: IOT_CLIENT_ID,
    certPath,
    keyPath,
    caPath,
    protocol: "mqtts",
    reconnectPeriod: 1000,
    keepalive: 60,
    debug: true,
  });

  iotDevice.on("connect", () => {
    iotConnected = true;
    console.log("[IoT] Connected. Subscribing to topics:", IOT_TOPICS);
    IOT_TOPICS.forEach((topic) => {
      iotDevice.subscribe(topic, { qos: 0 }, (err) => {
        if (err)
          console.error(`[IoT] Failed to subscribe to ${topic}:`, err.message);
        else console.log(`[IoT] Subscribed: ${topic}`);
      });
    });
  });

  iotDevice.on("message", (topic, payloadBuffer) => {
    try {
      const payloadText = payloadBuffer.toString("utf-8");
      console.log(`[IoT] Received message on topic: ${topic}`);
      console.log(`[IoT] Payload size: ${payloadBuffer.length} bytes`);
      console.log(`[IoT] Payload preview: ${payloadText.substring(0, 100)}`);

      const parsed = JSON.parse(payloadText);
      const normalized = normalizeIncomingMessage(parsed, topic);

      latestTelemetry = {
        ...normalized,
        topic,
        receivedAt: new Date().toISOString(),
      };

      // Update buffer
      telemetryBuffer.unshift(latestTelemetry);
      if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
        telemetryBuffer.pop();
      }

      console.log(`[IoT] Normalized telemetry:`, normalized);
      console.log(
        `[Socket] Broadcasting to ${socketClientCount} connected clients...`,
      );

      io.emit("telemetry", latestTelemetry);

      console.log(`[Socket] Telemetry emitted successfully`);
    } catch (error) {
      console.error("[IoT] Failed to parse telemetry payload:", error.message);
      console.error("[IoT] Raw payload:", payloadBuffer.toString("utf-8"));
    }
  });

  iotDevice.on("error", (error) => {
    iotConnected = false;
    console.error("[IoT] Error:", error?.message || String(error));
    if (error?.code) console.error("[IoT] Error code:", error.code);
    if (error?.errno) console.error("[IoT] Error errno:", error.errno);
    if (error?.syscall) console.error("[IoT] Syscall:", error.syscall);
    try {
      console.error("[IoT] Full error object:", JSON.stringify(error, null, 2));
    } catch (_) {}

    // Broadcast error to all connected clients
    io.emit("iotError", {
      message: error?.message || String(error),
      code: error?.code,
      timestamp: new Date().toISOString(),
    });
  });

  iotDevice.on("close", () => {
    iotConnected = false;
    console.warn("[IoT] Connection closed");
    io.emit("iotStatus", { connected: false, status: "closed" });
  });

  iotDevice.on("reconnect", () => {
    console.log("[IoT] Attempting to reconnect...");
    io.emit("iotStatus", { connected: false, status: "reconnecting" });
  });

  iotDevice.on("offline", () => {
    iotConnected = false;
    console.warn("[IoT] Device offline");
    io.emit("iotStatus", { connected: false, status: "offline" });
  });
}

server.listen(PORT, () => {
  console.log(`[Backend] Proxy server running on http://localhost:${PORT}`);
  console.log(`[Backend] Frontend origin allowed: ${FRONTEND_ORIGIN}`);
});

function resolvePath(inputPath) {
  if (!inputPath) return "";
  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(__dirname, inputPath);
}

function existsAll(paths) {
  return paths.every((targetPath) => fs.existsSync(targetPath));
}

function normalizeIncomingMessage(parsed, topic) {
  if (
    parsed?.DeviceId &&
    parsed?.SensorType &&
    parsed?.SensorValue !== undefined
  ) {
    return {
      ...parsed,
      SensorValue: Number(parsed.SensorValue),
    };
  }

  const valuesObj = parsed?.values || parsed?.sensors || parsed?.data;
  if (valuesObj && typeof valuesObj === "object" && !Array.isArray(valuesObj)) {
    const first = Object.entries(valuesObj).find(([, value]) =>
      Number.isFinite(Number(value)),
    );
    if (first) {
      const [sensorType, sensorValue] = first;
      return {
        DeviceId:
          parsed?.DeviceId || parsed?.deviceId || inferDeviceIdFromTopic(topic),
        SensorType: sensorType,
        SensorValue: Number(sensorValue),
        ...parsed,
      };
    }
  }

  return {
    DeviceId:
      parsed?.DeviceId ||
      parsed?.deviceId ||
      inferDeviceIdFromTopic(topic) ||
      "unknown-device",
    SensorType: parsed?.SensorType || parsed?.sensorType || "unknown",
    SensorValue: Number(
      parsed?.SensorValue ?? parsed?.sensorValue ?? parsed?.value ?? 0,
    ),
    ...parsed,
  };
}

function inferDeviceIdFromTopic(topic) {
  const parts = String(topic || "").split("/");
  if (parts.length >= 2 && parts[0] === "gateway") {
    return parts[1];
  }
  return parts.length > 1 ? parts[1] : undefined;
}

function loadEnvironment() {
  const envPaths = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "..", ".env.local"),
  ];

  envPaths.forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  });
}
