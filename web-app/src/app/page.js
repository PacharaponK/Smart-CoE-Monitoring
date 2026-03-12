"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import DataTable from "@/components/DataTable";
import MqttProvider from "@/components/MqttProvider";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <MqttProvider>
      <div className="flex min-h-screen bg-clay-bg">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content — offset for sidebar */}
        <main className="flex-1 ml-[72px] sm:ml-64 transition-all duration-300">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {activeTab === "dashboard" && <Dashboard />}

            {activeTab === "devices" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Devices</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Manage and monitor connected IoT devices
                  </p>
                </div>
                <div className="clay-card animate-fade-in">
                  <p className="text-gray-500 text-center py-12">
                    Device management panel — Connect to AWS IoT Core to view
                    active devices.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Historical Data
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Browse and filter stored sensor readings from DynamoDB
                  </p>
                </div>
                <DataTable />
              </div>
            )}

            {activeTab === "alerts" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Alerts</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    View system alerts and notifications
                  </p>
                </div>
                <div className="clay-card animate-fade-in">
                  <p className="text-gray-500 text-center py-12">
                    Alert configuration and history — Set thresholds for anomaly
                    detection.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Configuration and preferences
                  </p>
                </div>
                <div className="clay-card animate-fade-in">
                  <p className="text-gray-500 text-center py-12">
                    System settings and AWS configuration management.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Help</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Documentation and support
                  </p>
                </div>
                <div className="clay-card animate-fade-in">
                  <div className="max-w-2xl mx-auto py-8">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">
                      Getting Started
                    </h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>
                        1. Configure frontend{" "}
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                          .env.local
                        </code>{" "}
                        with backend URL
                      </p>
                      <p>
                        2. Configure backend{" "}
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                          backend/.env
                        </code>{" "}
                        with AWS IoT mTLS certificate paths and DynamoDB
                        credentials
                      </p>
                      <p>
                        3. Ensure DynamoDB table{" "}
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                          SensorData
                        </code>{" "}
                        exists in your AWS account
                      </p>
                      <p>4. Run backend proxy, then run Next.js frontend</p>
                      <p>
                        5. Deploy IoT gateways that publish to{" "}
                        <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                          gateway/+/telemetry/aggregated
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </MqttProvider>
  );
}
