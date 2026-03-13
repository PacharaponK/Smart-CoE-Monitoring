# Project Overview: Smart CoE Monitoring

The **Smart CoE Monitoring** project is a comprehensive IoT ecosystem designed to monitor, collect, and analyze environmental data (temperature, humidity, light, sound, etc.) across various rooms in the Computer Engineering (CoE) building. The system follows a multi-tier architecture, from hardware sensor nodes to edge gateways and a cloud-integrated real-time dashboard.

## Architecture & Technology Stack

-   **Hardware Layer:** Sensor nodes based on Arduino/ESP32 (e.g., in `R200/`, `R201/`, `experiment-code/`) using protocols like **ESP-NOW**, **CoAP**, and **BLE**.
-   **Gateway Layer:** Python-based edge gateways (`pi-gateway-one/`, `pi-gateway-two/`) that aggregate local MQTT data and forward it to the cloud (Azure IoT Hub/AWS IoT Core).
-   **Cloud Layer:** Transitioning from **Microsoft Azure** (IoT Hub, Stream Analytics, SQL DB) to **AWS** (IoT Core, DynamoDB, API Gateway).
-   **Dashboard Layer:** A Next.js application (`web-app/`) providing real-time monitoring via Socket.io and historical data visualization.

---

## Building and Running

### Web Application (`web-app/`)

The web application consists of a Next.js frontend and an Express proxy backend.

-   **Install Dependencies:**
    ```bash
    cd web-app
    npm install
    ```
-   **Development Mode:** Runs both the frontend and backend proxy concurrently.
    ```bash
    npm run dev
    ```
-   **Backend Proxy only:**
    ```bash
    npm run dev:backend
    ```
-   **Frontend only:**
    ```bash
    npm run dev:web
    ```
-   **Production Build:**
    ```bash
    npm run build
    npm start
    ```

### Edge Gateways (`pi-gateway-one/`, `pi-gateway-two/`)

-   **Setup:**
    ```bash
    cd pi-gateway-one
    python -m venv .venv
    source .venv/bin/activate  # or .venv\Scripts\activate on Windows
    pip install -r requirements.txt
    ```
-   **Run:**
    ```bash
    python main.py
    ```

---

## Development Conventions

-   **Environment Variables:** Both the gateways and the web app rely heavily on `.env` files for configuration (MQTT brokers, IoT endpoints, AWS/Azure credentials). Refer to `.env.example` in respective directories.
-   **Real-time Data Flow:** Sensor nodes publish to local MQTT topics -> Gateways subscribe and aggregate -> Gateways publish to AWS IoT Core -> Backend Proxy receives via AWS IoT SDK -> Dashboard receives via Socket.io.
-   **Historical Data:** Fetched from AWS API Gateway which queries DynamoDB.
-   **Sensor Metadata:** The `QualityStatus` field (1 for good, 0 for bad) is used for basic data validation at the gateway level.

## Key Directories

-   `web-app/`: Core web application (Next.js) and Node.js proxy server.
-   `pi-gateway-*/`: Python implementations of edge gateways with HA support.
-   `experiment-code/`: Prototypes for various communication protocols (ESP-NOW, NRF24).
-   `R200/`, `R201/`: Firmware for specific sensor node deployments.
-   `docs/`: Detailed project documentation in Markdown and Word formats.
-   `mocks/`: Sample data for testing stream processing.
