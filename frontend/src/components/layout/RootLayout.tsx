import { Outlet } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen w-full relative bg-black">
      {/* Indigo Cosmos Background with Top Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99, 102, 241, 0.25), transparent 70%), #000000",
        }}
      />

      {/* Content */}
      <div className="flex h-screen relative z-10">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-16"
          } flex-shrink-0 border-r transition-all duration-300 ease-in-out`}
        >
          <div className="h-full">
            <AppSidebar isCollapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
