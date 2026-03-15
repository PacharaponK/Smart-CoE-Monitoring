import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function GET() {
  try {
    // ดึงข้อมูล 50 รายการล่าสุดจาก DynamoDB
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME || "SensorData",
      Limit: 50,
    });

    const response = await docClient.send(command);
    
    // จัดกลุ่มข้อมูลตาม DeviceId เพื่อหาค่าล่าสุดของแต่ละเครื่อง
    const latestData = {};
    const sortedItems = (response.Items || []).sort((a, b) => b.Timestamp - a.Timestamp);
    
    sortedItems.forEach(item => {
      if (!latestData[item.DeviceId]) {
        latestData[item.DeviceId] = item;
      }
    });

    return Response.json({ 
      success: true, 
      data: Object.values(latestData),
      all: sortedItems 
    });
  } catch (error) {
    console.error("DynamoDB Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
