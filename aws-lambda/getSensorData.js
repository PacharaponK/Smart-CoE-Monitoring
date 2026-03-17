import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "IoTData";
const DEFAULT_LIMIT = Number(process.env.DEFAULT_LIMIT || 20000);
const MAX_LIMIT = Math.max(100000, Number(process.env.MAX_LIMIT || 100000));
const MAX_MULTI_ROOM_LIMIT = Math.max(
  50000,
  Number(process.env.MAX_MULTI_ROOM_LIMIT || MAX_LIMIT),
);
const MAX_PER_ROOM_LIMIT = Math.max(
  2000,
  Number(process.env.MAX_PER_ROOM_LIMIT || 10000),
);
const MIN_PER_ROOM_LIMIT = 20;
const QUERY_TIMEOUT_MS = Number(process.env.DDB_QUERY_TIMEOUT_MS || 1800);

// รายชื่อห้องทั้งหมด
const ALL_ROOMS = [
  "R200",
  "R201",
  "R303",
  "Co_Ai",
];

/**
 * Parse and clamp limit to keep query cost predictable.
 */
const parseLimit = (limitParam) => {
  if (!limitParam) {
    return DEFAULT_LIMIT;
  }

  const parsed = parseInt(limitParam, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

/**
 * Parse ExclusiveStartKey from query string.
 */
const parseLastKey = (lastKeyParam) => {
  if (!lastKeyParam) {
    return undefined;
  }

  try {
    return JSON.parse(lastKeyParam);
  } catch (error) {
    throw new Error("Invalid lastKey JSON");
  }
};

/**
 * Convert many timestamp formats to epoch ms.
 */
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

/**
 * Apply time range filter as a safety net in case upstream query conditions are bypassed.
 */
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

/**
 * Parse room list from CSV or JSON array and normalize names.
 */
const parseRooms = (roomsParam) => {
  if (!roomsParam || typeof roomsParam !== "string") {
    return [];
  }

  let rawRooms = [];
  const trimmed = roomsParam.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawRooms = parsed;
      }
    } catch {
      rawRooms = [];
    }
  } else {
    rawRooms = trimmed.split(",");
  }

  const roomMap = new Map(ALL_ROOMS.map((room) => [room.toLowerCase(), room]));
  const normalized = rawRooms
    .map((room) => String(room || "").trim())
    .filter(Boolean)
    .map((room) => roomMap.get(room.toLowerCase()) || room);

  return [...new Set(normalized)];
};

/**
 * Keep aggregated query small enough to fit Lambda timeout budget.
 */
const getAggregatedPerRoomLimit = (
  overallLimit,
  roomCount = ALL_ROOMS.length,
) => {
  const rooms = roomCount || 1;
  const boundedOverall = Math.min(overallLimit, MAX_MULTI_ROOM_LIMIT);
  const basePerRoom = Math.ceil(boundedOverall / rooms);
  const withBuffer = basePerRoom + 20;
  return Math.min(Math.max(withBuffer, MIN_PER_ROOM_LIMIT), MAX_PER_ROOM_LIMIT);
};

/**
 * Prevent a single slow room query from consuming the whole Lambda budget.
 */
const withTimeout = async (promise, timeoutMs, label) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), timeoutMs);
    }),
  ]);
};

/**
 * Build a query request for one room/device.
 */
const buildRoomQueryParams = (room, filters, exclusiveStartKey) => {
  const { sensorType, startTime, endTime, limit } = filters;

  let keyCondition = "DeviceId = :device";
  const expressionAttributeValues = { ":device": room };
  const expressionAttributeNames = {
    "#device": "DeviceId",
    "#ts": "Timestamp",
    "#st": "SensorType",
    "#room": "Room",
  };

  if (startTime && endTime) {
    keyCondition += " AND #ts BETWEEN :start AND :end";
    expressionAttributeValues[":start"] = startTime;
    expressionAttributeValues[":end"] = endTime;
  } else if (startTime) {
    keyCondition += " AND #ts >= :start";
    expressionAttributeValues[":start"] = startTime;
  } else if (endTime) {
    keyCondition += " AND #ts <= :end";
    expressionAttributeValues[":end"] = endTime;
  }

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionAttributeValues,
    ProjectionExpression: "#device, #room, #ts, #st, SensorValue",
    ScanIndexForward: false,
    Limit: limit,
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (sensorType) {
    params.FilterExpression = "#st = :sensorType";
    params.ExpressionAttributeValues[":sensorType"] = sensorType;
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  return params;
};

/**
 * Single-room query with native DynamoDB pagination.
 */
const fetchRoomDataPage = async (room, filters, exclusiveStartKey) => {
  const params = buildRoomQueryParams(room, filters, exclusiveStartKey);
  const response = await docClient.send(new QueryCommand(params));

  return {
    items: response.Items || [],
    lastKey: response.LastEvaluatedKey || null,
    count: response.Count || 0,
  };
};

/**
 * Multi-room fetch for aggregated dashboard mode.
 * This intentionally reads only the first page per room to avoid Lambda timeout.
 */
const fetchRoomData = async (room, filters) => {
  const params = buildRoomQueryParams(room, filters, undefined);
  const response = await withTimeout(
    docClient.send(new QueryCommand(params)),
    QUERY_TIMEOUT_MS,
    `multi-room ${room}`,
  );
  return response.Items || [];
};

export const handler = async (event) => {
  try {
    const qp = event.queryStringParameters || {};

    const deviceId = qp.deviceId || qp.DeviceId || qp.room || qp.Room;
    const sensorType = qp.sensorType || qp.SensorType;
    const startTime = qp.startTime;
    const endTime = qp.endTime;
    const limit = parseLimit(qp.limit);
    const lastKey = parseLastKey(qp.lastKey);
    const requestedRooms = parseRooms(qp.rooms);

    const filters = { sensorType, startTime, endTime, limit };
    let responseItems = [];
    let responseLastKey = null;
    let responseCount = 0;

    if (deviceId) {
      const result = await fetchRoomDataPage(deviceId, filters, lastKey);
      responseItems = applyTimeFilter(result.items, startTime, endTime);
      responseLastKey = result.lastKey;
      responseCount = responseItems.length;
    } else {
      const targetRooms =
        requestedRooms.length > 0 ? requestedRooms : ALL_ROOMS;
      const effectiveLimit = Math.min(limit, MAX_MULTI_ROOM_LIMIT);
      const perRoomLimit = getAggregatedPerRoomLimit(
        effectiveLimit,
        targetRooms.length,
      );
      const aggregateFilters = { ...filters, limit: perRoomLimit };
      const queryPromises = targetRooms.map((room) =>
        fetchRoomData(room, aggregateFilters),
      );

      const results = await Promise.allSettled(queryPromises);
      const fulfilledResults = results.filter(
        (result) => result.status === "fulfilled",
      );

      fulfilledResults.forEach((result) => {
        responseItems = responseItems.concat(result.value);
      });

      if (fulfilledResults.length === 0) {
        throw new Error("All room queries failed or timed out");
      }

      responseItems = applyTimeFilter(responseItems, startTime, endTime);
      responseItems.sort(
        (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp),
      );
      responseItems = responseItems.slice(0, effectiveLimit);
      responseCount = responseItems.length;
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: responseItems,
        lastKey: responseLastKey,
        count: responseCount,
      }),
    };
  } catch (error) {
    console.error("Error retrieving data from DynamoDB:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Could not retrieve data",
        message: error.message,
      }),
    };
  }
};
