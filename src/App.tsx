import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { isSupabaseConfigured } from "./lib/supabase";
import AuthPage from "./components/auth/AuthPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WorkspacePage from "./pages/WorkspacePage";
import ProjectsPage from "./pages/ProjectsPage";
import SettingsPage from "./pages/SettingsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import StreaksPage from "./pages/StreaksPage";
import StreakGroupDetailPage from "./pages/StreakGroupDetailPage";
function Shell(){return <div className="min-h-screen bg-[#050816] text-slate-100 relative overflow-hidden"><div className="fixed -top-32 right-10 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#1d4ed8]/25 to-[#38bdf8]/10 blur-[130px] pointer-events-none animate-[fogDrift_18s_ease-in-out_infinite_alternate] z-0" /><div className="fixed -bottom-40 -left-20 w-[600px] h-[600px] rounded-full bg-[#1e40af]/20 blur-[140px] pointer-events-none animate-[fogDrift_18s_ease-in-out_infinite_alternate] z-0" /><div className="relative z-10 flex min-h-screen"><Sidebar/><div className="min-w-0 flex-1"><Topbar/><Routes><Route path="/" element={<WorkspacePage view="dashboard"/>}/><Route path="/my-day" element={<WorkspacePage view="day"/>}/><Route path="/calendar" element={<WorkspacePage view="calendar"/>}/><Route path="/upcoming" element={<WorkspacePage view="upcoming"/>}/><Route path="/completed" element={<WorkspacePage view="completed"/>}/><Route path="/analytics" element={<WorkspacePage view="analytics"/>}/><Route path="/streaks" element={<StreaksPage/>}/><Route path="/streaks/:groupId" element={<StreakGroupDetailPage/>}/><Route path="/projects" element={<ProjectsPage/>}/><Route path="/projects/:projectId" element={<ProjectDetailPage/>}/><Route path="/categories" element={<CategoriesPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></div></div></div>}
export default function App(){const {session,loading}=useAuth();if(!isSupabaseConfigured)return <main className="grid min-h-screen place-items-center bg-[#09090b] p-5 text-center"><div><h1 className="text-2xl font-semibold text-white">Connect Tiny Wins to Supabase</h1><p className="mt-3 max-w-lg text-zinc-500">Add the public URL and anon key to a <code>.env</code> file, then restart the dev server. See <code>.env.example</code> and <code>supabase/schema.sql</code>.</p></div></main>;if(loading)return <main className="grid min-h-screen place-items-center bg-[#09090b] text-zinc-500">Loading Tiny Wins…</main>;return session?<Shell/>:<AuthPage/>}
<div className="p-4 mx-3 mb-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-full bg-purple-600/30 overflow-hidden">
      <img src="/avatar.png" alt="Profile" className="w-full h-full object-cover" />
    </div>
    <div>
      <p className="text-xs font-semibold text-white">Khushi Tiwari</p>
      <p className="text-[10px] text-zinc-400">Student</p>
    </div>
  </div>
  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-center">
    <p className="font-handwriting text-sm text-pink-300">
      “A better you is built by tiny wins” 💕
    </p>
  </div>
</div>
