"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import RouteMeta from "@/components/RouteMeta";

export default function DashboardShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        data-app-sidebar-frame
        className={`fixed lg:relative inset-y-0 left-0 z-30 transform transition-[transform,width] duration-300 ease-in-out lg:h-screen lg:w-20 lg:shrink-0 lg:transform-none lg:hover:w-72 lg:focus-within:w-72 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div data-app-content className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <RouteMeta />
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 bg-gray-50 p-4 md:p-6 lg:pl-8 dark:bg-[#0f1117]">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
