import { Outlet } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-0"
          } flex-shrink-0 overflow-hidden border-r transition-all duration-300 ease-in-out`}
        >
          <div className="h-full w-64">
            <AppSidebar />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
