import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { isSupabaseConfigured } from "./lib/supabase";
import AuthPage from "./components/auth/AuthPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import MobileDrawer from "./components/layout/MobileDrawer";
import BottomNav from "./components/layout/BottomNav";
import WorkspacePage from "./pages/WorkspacePage";
import ProjectsPage from "./pages/ProjectsPage";
import SettingsPage from "./pages/SettingsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import StreaksPage from "./pages/StreaksPage";
import StreakGroupDetailPage from "./pages/StreakGroupDetailPage";

function Shell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#050816] text-slate-100 overflow-x-hidden">
      {/* Background ambient gradient glow blobs */}
      <div className="fixed -top-32 right-10 h-[350px] w-[350px] sm:h-[650px] sm:w-[650px] rounded-full bg-gradient-to-br from-[#1d4ed8]/25 to-[#38bdf8]/10 blur-[90px] sm:blur-[130px] pointer-events-none animate-[fogDrift_18s_ease-in-out_infinite_alternate] z-0" />
      <div className="fixed -bottom-40 -left-20 h-[300px] w-[300px] sm:h-[600px] sm:w-[600px] rounded-full bg-[#1e40af]/20 blur-[100px] sm:blur-[140px] pointer-events-none animate-[fogDrift_18s_ease-in-out_infinite_alternate] z-0" />

      <div className="relative z-10 flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Slide-Out Drawer */}
        <MobileDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="min-w-0 flex-1 flex flex-col pb-20 lg:pb-0">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />

          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<WorkspacePage view="dashboard" />} />
              <Route path="/my-day" element={<WorkspacePage view="day" />} />
              <Route path="/calendar" element={<WorkspacePage view="calendar" />} />
              <Route path="/upcoming" element={<WorkspacePage view="upcoming" />} />
              <Route path="/completed" element={<WorkspacePage view="completed" />} />
              <Route path="/analytics" element={<WorkspacePage view="analytics" />} />
              <Route path="/streaks" element={<StreaksPage />} />
              <Route path="/streaks/:groupId" element={<StreakGroupDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09090b] p-5 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Connect Tiny Wins to Supabase</h1>
          <p className="mt-3 max-w-lg text-zinc-500">
            Add the public URL and anon key to a <code>.env</code> file, then restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09090b] text-zinc-500">
        Loading Tiny Wins…
      </main>
    );
  }

  return session ? <Shell /> : <AuthPage />;
}
