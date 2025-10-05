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
        {/* Sidebar Container - maintains space */}
        <div
          className={`flex-shrink-0 transition-all duration-500 ease-in-out ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          {/* Floating Sidebar */}
          <aside
            className={`fixed left-4 top-4 bottom-4 bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 transition-all duration-500 ease-in-out overflow-hidden ${
              sidebarOpen ? "w-60" : "w-16"
            }`}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <AppSidebar isCollapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            </div>
          </aside>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
