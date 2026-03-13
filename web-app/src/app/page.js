"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import MqttProvider from "@/components/MqttProvider";

// Modular Tab Components
import DevicesTab from "@/components/tabs/DevicesTab";
import AlertsTab from "@/components/tabs/AlertsTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import HelpTab from "@/components/tabs/HelpTab";
import DataTable from "@/components/DataTable";

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
            {activeTab === "devices" && <DevicesTab />}
            {activeTab === "alerts" && <AlertsTab />}
            {activeTab === "settings" && <SettingsTab />}
            {activeTab === "help" && <HelpTab />}
            
            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    ข้อมูลย้อนหลัง (Historical Data)
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    เรียกดูและกรองข้อมูลการตรวจวัดเซ็นเซอร์ที่จัดเก็บใน DynamoDB
                  </p>
                </div>
                <DataTable />
              </div>
            )}
          </div>
        </main>
      </div>
    </MqttProvider>
  );
}
