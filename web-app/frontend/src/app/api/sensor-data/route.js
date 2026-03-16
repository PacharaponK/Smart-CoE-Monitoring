import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AWS_REGION, docClient, TABLE_NAME } from "@/lib/dynamodb";

export const dynamic = "force-dynamic";
const ALL_ROOMS = [
  "R200",
  "R201",
  "R302",
  "R303",
  "COE",
  "AIE",
  "Co_Ai",
  "NETWORK",
];
const FETCH_ALL_PAGE_SIZE = 500;
const FETCH_ALL_MAX_PAGES = 300;

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

const buildRoomQuery = ({
  room,
  sensorType,
  startTime,
  endTime,
  limit,
  lastKey,
}) => {
  const expressionNames = {
    "#pk": "DeviceId",
    "#sk": "Timestamp",
  };
  const expressionValues = {
    ":pk": room,
  };
  const keyCondition = ["#pk = :pk"];

  if (startTime && endTime) {
    keyCondition.push("#sk BETWEEN :start AND :end");
    expressionValues[":start"] = startTime;
    expressionValues[":end"] = endTime;
  } else if (startTime) {
    keyCondition.push("#sk >= :start");
    expressionValues[":start"] = startTime;
  } else if (endTime) {
    keyCondition.push("#sk <= :end");
    expressionValues[":end"] = endTime;
  }

  let filterExpression;
  if (sensorType) {
    expressionNames["#st"] = "SensorType";
    expressionValues[":st"] = sensorType;
    filterExpression = "#st = :st";
  }

  return new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: keyCondition.join(" AND "),
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
    ...(filterExpression && { FilterExpression: filterExpression }),
    ScanIndexForward: false,
    Limit: limit,
    ...(lastKey && { ExclusiveStartKey: lastKey }),
  });
};

const toBoolean = (value) => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const fetchAllForRoom = async ({
  room,
  sensorType,
  startTime,
  endTime,
  maxItems,
}) => {
  let items = [];
  let lastKey = undefined;
  let pages = 0;

  do {
    const command = buildRoomQuery({
      room,
      sensorType,
      startTime,
      endTime,
      limit: FETCH_ALL_PAGE_SIZE,
      lastKey,
    });
    const result = await docClient.send(command);
    items = items.concat(result.Items || []);
    lastKey = result.LastEvaluatedKey;
    pages += 1;

    if (!lastKey) break;
    if (items.length >= maxItems) break;
    if (pages >= FETCH_ALL_MAX_PAGES) break;
  } while (true);

  return items;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const room = searchParams.get("room");
    const sensorType = searchParams.get("sensorType");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const lastKey = searchParams.get("lastKey");
    const fetchAll = toBoolean(searchParams.get("fetchAll"));
    const parsedLastKey = lastKey ? JSON.parse(lastKey) : undefined;
    const targetRoom = deviceId || room;

    if (targetRoom) {
      if (fetchAll) {
        const roomItems = await fetchAllForRoom({
          room: targetRoom,
          sensorType,
          startTime,
          endTime,
          maxItems: limit,
        });
        const filteredAll = applyTimeFilter(roomItems, startTime, endTime)
          .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
          .slice(0, limit);

        return NextResponse.json({
          items: filteredAll,
          lastKey: null,
          count: filteredAll.length,
          fetchAll: true,
        });
      }

      const command = buildRoomQuery({
        room: targetRoom,
        sensorType,
        startTime,
        endTime,
        limit,
        lastKey: parsedLastKey,
      });
      const result = await docClient.send(command);
      const filtered = applyTimeFilter(result.Items || [], startTime, endTime);

      return NextResponse.json({
        items: filtered,
        lastKey: result.LastEvaluatedKey || null,
        count: filtered.length,
      });
    }

    if (fetchAll) {
      const roomResults = await Promise.all(
        ALL_ROOMS.map((roomName) =>
          fetchAllForRoom({
            room: roomName,
            sensorType,
            startTime,
            endTime,
            maxItems: Math.ceil(limit / ALL_ROOMS.length) + FETCH_ALL_PAGE_SIZE,
          }),
        ),
      );

      const mergedAll = applyTimeFilter(roomResults.flat(), startTime, endTime)
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
        .slice(0, limit);

      return NextResponse.json({
        items: mergedAll,
        lastKey: null,
        count: mergedAll.length,
        fetchAll: true,
      });
    }

    const perRoomLimit = Math.max(20, Math.ceil(limit / ALL_ROOMS.length) + 10);
    const results = await Promise.all(
      ALL_ROOMS.map(async (roomName) => {
        const command = buildRoomQuery({
          room: roomName,
          sensorType,
          startTime,
          endTime,
          limit: perRoomLimit,
        });
        const result = await docClient.send(command);
        return result.Items || [];
      }),
    );

    const merged = applyTimeFilter(results.flat(), startTime, endTime)
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
      .slice(0, limit);

    return NextResponse.json({
      items: merged,
      lastKey: null,
      count: merged.length,
    });
  } catch (error) {
    console.error("DynamoDB query error:", error);

    if (
      error?.name === "ResourceNotFoundException" ||
      error?.__type ===
        "com.amazonaws.dynamodb.v20120810#ResourceNotFoundException"
    ) {
      return NextResponse.json(
        {
          items: [],
          lastKey: null,
          count: 0,
          warning: `DynamoDB table '${TABLE_NAME}' was not found in region '${AWS_REGION}'.`,
          details:
            "Verify DYNAMODB_TABLE_NAME, AWS_REGION, and AWS credentials in .env.local.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch sensor data" },
      { status: 500 },
    );
  }
}
