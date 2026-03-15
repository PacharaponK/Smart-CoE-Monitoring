# WebSocket Debugging Guide - IoT Dashboard

## Quick Diagnostics

### 1. Check Backend Connection to AWS IoT
```bash
# Terminal 1: Start backend with full logging
npm run dev:backend

# Look for these log patterns:
# [IoT] Starting connection...
# [IoT] Connected. Subscribing to topics:
# [IoT] Subscribed: gateway/...
```

### 2. Check Frontend-Backend Socket.io Connection
```
# In Browser DevTools (F12) > Console, look for:
[MQTT] Socket connected successfully!
[MQTT] Socket ID: <socket-id>
[MQTT] Transport: websocket  (or 'polling' if WebSocket fails)
```

### 3. Check End-to-End Data Flow
```
# Terminal: Backend console should show sequence:
[IoT] Received message on topic: gateway/...
[IoT] Payload preview: {...}
[IoT] Normalized telemetry: {...}
[Socket] Broadcasting to X connected clients...
[Socket] Telemetry emitted successfully

# Browser console should show:
[MQTT] Received telemetry: {...}
```

## Configuration Checklist

### Backend Configuration (backend/.env)
- [ ] `AWS_IOT_ENDPOINT` is set (e.g., `a2bgtu4hk9hwe6-ats.iot.ap-southeast-1.amazonaws.com`)
- [ ] `AWS_IOT_TOPICS` matches published topics (e.g., `gateway/gateway-one/telemetry/aggregated`)
- [ ] Certificate files exist:
  - [ ] `secrets/<cert>.pem.crt` (certificate)
  - [ ] `secrets/<cert>.pem.key` (private key)
  - [ ] `secrets/AmazonRootCA1.pem` (CA certificate)
- [ ] `FRONTEND_ORIGIN` matches your frontend URL (default: `http://localhost:3000`)
- [ ] `PORT` is set (default: 4000)

### Frontend Configuration
- [ ] `.env.local` or `.env` has `NEXT_PUBLIC_BACKEND_URL` (default: `http://localhost:4000`)
- [ ] Backend is accessible from frontend URL

## Common Issues & Solutions

### Issue: Backend shows "Cannot find module" errors
**Solution:** 
```bash
cd web-app
npm install
```

### Issue: Backend shows certificate path errors
**Solution:** Check these exist:
```bash
ls -la backend/.env
ls -la secrets/
cat backend/.env  # Verify PATH_TO_* variables point to correct files
```

### Issue: Backend connects to AWS IoT but no message logs appear
**Possible causes:**
1. **Wrong topic subscription** - Verify `AWS_IOT_TOPICS` matches actual published topics
2. **AWS IoT policy restriction** - Check AWS IoT policy allows `iot:Subscribe`
3. **No devices publishing** - Verify devices/gateways are actively sending data
4. **Topic wildcards** - If using `+` in subscriptions, ensure data is published to matching topics

**Debug steps:**
```bash
# 1. Check AWS IoT console - verify rules/topics are active
# 2. Verify backend subscribed to correct topics (look for [IoT] Subscribed logs)
# 3. Check firewall/proxy isn't blocking MQTT port 8883
```

### Issue: Frontend shows "Offline" but backend is running
**Possible causes:**
1. **WebSocket connection blocked** - Falls back to polling (slower but works)
2. **CORS issue** - Backend CORS doesn't allow frontend origin
3. **Wrong backend URL** - Check `NEXT_PUBLIC_BACKEND_URL`

**Debug steps:**
1. Open DevTools > console, look for exact error
2. Check DevTools > Network tab for socket.io connection
3. Verify backend is running: `curl http://localhost:4000/health`
4. Check backend logs for connection errors

### Issue: Data not appearing in dashboard
**Check in order:**
```
1. Backend logs show telemetry received? → If NOT, AWS IoT connection issue
2. Frontend console shows [MQTT] Received telemetry? → If NOT, socket.io not emitting
3. Dashboard UI shows connection status? → If Offline, frontend-backend issue
4. Dashboard stats show 0 devices? → Data maybe not in correct format
```

## Health Check Endpoints

### Backend Health Check
```bash
curl http://localhost:4000/health
```

Returns:
```json
{
  "ok": true,
  "iotConnected": true,     # AWS IoT connection status
  "socketClientCount": 2,   # Connected WebSocket clients
  "topics": ["gateway/..."],
  "latestTelemetry": {...}  # Last received message
}
```

### Latest Telemetry Endpoint
```bash
curl http://localhost:4000/api/realtime/latest
```

Returns last message received from AWS IoT.

## Logging Output Format

### Backend Logs
```
[Backend] - Server/Express logs
[Socket] - Socket.io connection events
[IoT] - AWS IoT connection and messages
```

### Frontend Logs
```
[MQTT] - Socket.io client connection events
```

## Performance Notes

- **WebSocket** (preferred): Real-time, lower latency
- **Polling fallback**: Works if WebSocket blocked, but higher latency (~30-60s delay per poll)
- **Message buffer**: Frontend keeps last 100 messages in memory

## Environment Variables Reference

### Backend (backend/.env)

| Variable | Default | Example |
|----------|---------|---------|
| PORT | 4000 | 4000 |
| FRONTEND_ORIGIN | http://localhost:3000 | http://localhost:3000 |
| AWS_IOT_ENDPOINT | - | a2bgtu4hk9hwe6-ats.iot.ap-southeast-1.amazonaws.com |
| AWS_IOT_TOPICS | gateway/+/telemetry/aggregated | gateway/gateway-one/telemetry/aggregated |
| AWS_IOT_CLIENT_ID | iot-dashboard-proxy-{timestamp} | sdk-nodejs-dashboard |
| PATH_TO_CERT | ../secrets/*.pem.crt | ../secrets/cert.pem.crt |
| PATH_TO_KEY | ../secrets/*.pem.key | ../secrets/key.pem.key |
| PATH_TO_ROOT_CA | ../secrets/AmazonRootCA1.pem | ../secrets/AmazonRootCA1.pem |

### Frontend (.env.local or .env)

| Variable | Default | Example |
|----------|---------|---------|
| NEXT_PUBLIC_BACKEND_URL | http://localhost:4000 | http://localhost:4000 |

## Next Steps if Still Not Working

1. Check [Smart COE Monitoring] README for setup instructions
2. Verify AWS IoT certificates are valid (not expired)
3. Check AWS IoT policy includes necessary permissions:
   - `iot:Connect`
   - `iot:Subscribe` 
   - `iot:Publish`
   - `iot:Receive`
4. Contact infrastructure team if AWS resources are misconfigured
