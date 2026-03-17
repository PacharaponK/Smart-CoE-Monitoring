import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// 🔍 ค้นหาชื่อห้องจาก DeviceId
const getRoomConfig = (deviceId) => {
    const defaultRoom = { name: "Unknown Room", url: process.env.DISCORD_WEBHOOK_DEFAULT };
    const identifier = String(deviceId || '').toUpperCase();
    
    if (identifier.includes("R200")) return { name: "R200", url: process.env.DISCORD_WEBHOOK_R200 };
    if (identifier.includes("R201")) return { name: "R201", url: process.env.DISCORD_WEBHOOK_R201 };
    if (identifier.includes("R202")) return { name: "R202", url: process.env.DISCORD_WEBHOOK_R202 }; 
    if (identifier.includes("R303")) return { name: "R303", url: process.env.DISCORD_WEBHOOK_R303 };
    if (identifier.includes("CO_AI")) return { name: "Co_Ai", url: process.env.DISCORD_WEBHOOK_CO_AI };
    
    return defaultRoom;
};

// 🔔 ฟังก์ชันสำหรับส่งแจ้งเตือนเข้า Discord ด้วยรูปแบบ Embeds
const sendDiscordAlert = async (data) => {
    const roomConfig = getRoomConfig(data.DeviceId); 
    const webhookUrl = roomConfig.url;
    
    if (!webhookUrl) {
        console.warn(`⚠️ ยกเลิกการส่ง! ไม่พบลิงก์ Webhook สำหรับห้อง: ${roomConfig.name}`);
        return;
    }

    const alertReason = (data.IsAlert && data.IsAlert.reason) ? data.IsAlert.reason : "ตรวจพบค่าความผิดปกติจากเซ็นเซอร์";

    // 🕒 จัดการแปลงเวลาให้เป็นเวลาประเทศไทย (UTC+7)
    let formattedTime = "ไม่ระบุเวลา";
    try {
        const dateObj = data.CreatedAt ? new Date(data.CreatedAt) : new Date();
        formattedTime = dateObj.toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    } catch (e) {
        console.error("เวลาที่ส่งมาแปลงค่าไม่ได้:", e);
    }

    // 🎨 สร้าง Payload แบบ Embeds ของ Discord
    const payload = {
        embeds: [
            {
                color: 16711680, // 🔴 โค้ดสีแดง (Decimal Color) บ่งบอกถึง Alert
                title: `🚨 [ALERT] แจ้งเตือนความผิดปกติ!`,
                description: `ตรวจพบข้อมูลผิดปกติจากห้อง **${roomConfig.name}**`,
                fields: [
                    {
                        name: "📌 Device ID",
                        value: `\`${data.DeviceId || "N/A"}\``,
                        inline: true // ทำให้แสดงผลเรียงกันในแนวนอน
                    },
                    {
                        name: "📊 Sensor Type",
                        value: `\`${data.SensorType || "N/A"}\``,
                        inline: true
                    },
                    {
                        name: "📈 Value",
                        value: `**${data.SensorValue}**`,
                        inline: true
                    },
                    {
                        name: "🛑 Reason",
                        value: `**${alertReason}**`,
                        inline: false // ทำให้ Reason ลงมาอยู่บรรทัดใหม่และกินพื้นที่เต็มความกว้าง
                    }
                ],
                footer: {
                    text: `🕒 เวลา: ${formattedTime} (เวลาไทย)`
                }
            }
        ]
    };

    try {
        console.log(`📡 กำลังยิงข้อมูลไปที่ Discord แบบ Embed...`);
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`❌ ส่ง Discord ไม่สำเร็จ: Status ${response.status}`);
        } else {
            console.log(`✅ ส่งแจ้งเตือนไปยัง Discord สำเร็จ!`);
        }
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดร้ายแรงขณะส่ง Discord:", error);
    }
};

export const handler = async (event) => {
    try {
        const sevenDaysInSeconds = 7 * 24 * 60 * 60;
        const expireTime = Math.floor(Date.now() / 1000) + sevenDaysInSeconds;

        const itemData = {
            DeviceId: event.DeviceId || "UnknownDevice", 
            Timestamp: event.CreatedAt || new Date().toISOString(),
            SensorType: event.SensorType || "Unknown",
            SensorValue: event.SensorValue !== undefined ? event.SensorValue : 0,
            QualityStatus: event.QualityStatus !== undefined ? event.QualityStatus : 0,
            ExpireTime: expireTime 
        };

        const params = { TableName: "IoTData", Item: itemData };
        const command = new PutCommand(params);
        await docClient.send(command);

        if (event.IsAlert && event.IsAlert.value == 1) {
            await sendDiscordAlert(event); 
        } 
        
        return { statusCode: 200, body: "Processed successfully" };
    } catch (error) {
        console.error("❌ Error:", error);
        throw error;
    }
};