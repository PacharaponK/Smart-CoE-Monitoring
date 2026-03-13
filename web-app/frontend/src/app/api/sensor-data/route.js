import { NextResponse } from "next/server";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { AWS_REGION, docClient, TABLE_NAME } from "@/lib/dynamodb";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const sensorType = searchParams.get("sensorType");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const lastKey = searchParams.get("lastKey");

    let command;

    if (deviceId) {
      // Query by DeviceId (Partition Key) with optional time range
      const keyCondition = ["#pk = :pk"];
      const expressionNames = { "#pk": "DeviceId" };
      const expressionValues = { ":pk": deviceId };

      if (startTime && endTime) {
        keyCondition.push("#sk BETWEEN :start AND :end");
        expressionNames["#sk"] = "Timestamp";
        expressionValues[":start"] = startTime;
        expressionValues[":end"] = endTime;
      } else if (startTime) {
        keyCondition.push("#sk >= :start");
        expressionNames["#sk"] = "Timestamp";
        expressionValues[":start"] = startTime;
      }

      let filterExpression;
      if (sensorType) {
        filterExpression = "#st = :st";
        expressionNames["#st"] = "SensorType";
        expressionValues[":st"] = sensorType;
      }

      command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: keyCondition.join(" AND "),
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ...(filterExpression && { FilterExpression: filterExpression }),
        Limit: limit,
        ScanIndexForward: false, // newest first
        ...(lastKey && { ExclusiveStartKey: JSON.parse(lastKey) }),
      });
    } else {
      // Scan with optional filter
      let filterExpressions = [];
      const expressionNames = {};
      const expressionValues = {};

      if (sensorType) {
        filterExpressions.push("#st = :st");
        expressionNames["#st"] = "SensorType";
        expressionValues[":st"] = sensorType;
      }

      command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
        ...(filterExpressions.length > 0 && {
          FilterExpression: filterExpressions.join(" AND "),
          ExpressionAttributeNames: expressionNames,
          ExpressionAttributeValues: expressionValues,
        }),
        ...(lastKey && { ExclusiveStartKey: JSON.parse(lastKey) }),
      });
    }

    const result = await docClient.send(command);

    return NextResponse.json({
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey || null,
      count: result.Count || 0,
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
