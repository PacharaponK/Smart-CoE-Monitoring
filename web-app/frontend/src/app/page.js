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
import HistoryTab from "@/components/tabs/HistoryTab";
import ImagesTab from "@/components/tabs/ImagesTab";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <MqttProvider>
      <div className="flex min-h-screen bg-clay-bg">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content — dynamic offset for sidebar */}
        <main 
          className={`flex-1 transition-all duration-300 ${
            collapsed ? 'ml-[72px]' : 'ml-[72px] sm:ml-64'
          }`}
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "devices" && <DevicesTab />}
            {activeTab === "data" && <HistoryTab />}
            {activeTab === "images" && <ImagesTab />}
            {activeTab === "alerts" && <AlertsTab />}
            {activeTab === "settings" && <SettingsTab />}
            {activeTab === "help" && <HelpTab />}
          </div>
        </main>
      </div>
    </MqttProvider>
  );
}
