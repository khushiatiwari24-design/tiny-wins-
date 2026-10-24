import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, FileText, FolderOpen, Lock, LogOut, Plus, RefreshCw, Trash2, Upload, Users, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { requireSupabase } from "../lib/supabase";
import type { Priority, TaskInput } from "../types/task";
import ProtectedContentViewer from "../components/projects/ProtectedContentViewer";
import {
  uploadProjectFile,
  fetchProjectFiles,
  deleteProjectFile,
  getFromIndexedDB,
  type StoredProjectFile as StoredFile,
} from "../lib/projectFiles";

type Project = {
  id: string;
  title: string;
  description: string;
  type: string;
  join_code: string;
  owner_id: string;
  created_at: string;
  materials?: any[];
  files?: any[];
  created_by?: string;
  creator_email?: string;
};

type Member = { user_id: string; role: string; joined_at: string; profile: { full_name: string; email: string } | null };
type Note = { id: string; title: string; content: string; author_id: string; created_at: string; author: { full_name: string } | null };
type Tab = "Overview" | "Tasks" | "Files" | "Notes" | "Members" | "Activity";

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatBytes = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { tasks: allTasks, categories, save, remove, toggle } = useTasks(session?.user.id, projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy code");
  const [uploading, setUploading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState("Personal");
  const [taskPriority, setTaskPriority] = useState<Priority>("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [preview, setPreview] = useState<{ file: StoredFile; url: string } | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const currentUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || "student",
      }
    : null;

  // Strict creator ownership check
  const isCreator = Boolean(
    (project && (project as any).created_by && (project as any).created_by === currentUser?.id) ||
    (project?.owner_id && project.owner_id === currentUser?.id) ||
    (project && (project as any).creator_email && (project as any).creator_email === currentUser?.email) ||
    currentUser?.role?.toLowerCase() === "teacher"
  );

  const projectTasks = useMemo(() => allTasks.filter(task => task.projectId === projectId), [allTasks, projectId]);
  const completedCount = projectTasks.filter(task => task.completed).length;
  const progress = projectTasks.length ? Math.round(completedCount / projectTasks.length * 100) : 0;

  const loadProjectData = async () => {
    if (!projectId) { setError("This project link is missing its project ID."); setLoading(false); return; }
    setLoading(true); setError("");
    const db = requireSupabase();

    let projectData: any = null;
    let fetchedOwnerProfile: any = null;
    let membersData: any[] = [];
    let notesData: any[] = [];

    try {
      const [projectResult, membersResult, notesResult] = await Promise.all([
        db.from("projects").select("id,title,description,type,join_code,owner_id,created_at,materials,files").eq("id", projectId).maybeSingle(),
        db.from("project_members").select("user_id,role,joined_at,profiles(full_name,email)").eq("project_id", projectId).order("joined_at"),
        db.from("notes").select("id,title,content,author_id,created_at,profiles(full_name)").eq("project_id", projectId).order("created_at", { ascending: false }),
      ]);

      if (projectResult?.data) {
        projectData = projectResult.data;
        const ownerProfileResult = await db.from("profiles").select("full_name,email").eq("id", projectData.owner_id).maybeSingle();
        fetchedOwnerProfile = ownerProfileResult?.data || null;
        setOwnerProfile(fetchedOwnerProfile);
      }
      if (membersResult?.data) membersData = membersResult.data;
      if (notesResult?.data) notesData = notesResult.data;
    } catch (e) {
      console.warn("Supabase project load error, falling back to local storage:", e);
    }

    // Local storage fallback for project
    if (!projectData) {
      try {
        const localOwned = JSON.parse(localStorage.getItem("tiny_wins_projects") || "[]");
        const localJoined = JSON.parse(localStorage.getItem("tiny_wins_joined_projects") || "[]");
        const found = [...localOwned, ...localJoined].find((p: any) => p.id === projectId);
        if (found) {
          projectData = {
            ...found,
            created_at: found.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error("Local project read error:", err);
      }
    }

    if (!projectData) {
      setError("This project could not be found or you do not have permission to view it.");
      setLoading(false);
      return;
    }

    setProject(projectData);

    // Fallback notes from local storage
    let localNotes: Note[] = [];
    try {
      const raw = localStorage.getItem(`tiny_wins_notes_${projectId}`);
      if (raw) localNotes = JSON.parse(raw);
    } catch (err) {
      console.error("Local notes read error:", err);
    }

    const fetchedNotes: Note[] = notesData.map((row) => ({
      ...row,
      author: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
    }));

    // Separate notes vs file materials
    const projectMaterials: any[] = Array.isArray(projectData.materials) ? projectData.materials : [];
    const noteItems: Note[] = projectMaterials.filter((m: any) => m && m.content && !m.mimetype && !m.path);

    const notesMap = new Map<string, Note>();
    fetchedNotes.forEach((n) => notesMap.set(n.id, n));
    noteItems.forEach((n) => {
      if (!notesMap.has(n.id)) notesMap.set(n.id, n);
    });
    localNotes.forEach((n) => {
      if (!notesMap.has(n.id)) notesMap.set(n.id, n);
    });
    setNotes(Array.from(notesMap.values()));

    const joinedMembers = membersData
      .map((row) => ({
        ...row,
        profile: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
      }))
      .filter((member) => member.user_id !== projectData.owner_id);

    setMembers([
      {
        user_id: projectData.owner_id,
        role: "teacher",
        joined_at: projectData.created_at || new Date().toISOString(),
        profile: fetchedOwnerProfile || { full_name: "Project Lead", email: "" },
      },
      ...joinedMembers,
    ]);

    setLoading(false);

    // Load files across Supabase projects table JSONB, storage bucket, and local fallback
    try {
      const allMemberIds = [projectData.owner_id, ...membersData.map((m) => m.user_id)];
      await loadFiles(projectId, allMemberIds);
    } catch {}
  };

  const syncMaterials = async () => {
    setSyncing(true);
    try {
      if (projectId) {
        const loadedFiles = await fetchProjectFiles(projectId, members.map((m) => m.user_id));
        setFiles(loadedFiles);
      }
      await loadProjectData();
      setNotice("✅ Latest materials synced successfully!");
    } catch (err: any) {
      console.warn("Sync warning:", err);
      setNotice("Materials synced with available sources.");
    } finally {
      setSyncing(false);
      window.setTimeout(() => setNotice(""), 3500);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.title}"? This will permanently delete the project and all notes/materials.`
    );
    if (!confirmed) return;

    try {
      await requireSupabase().from("projects").delete().eq("id", project.id);
    } catch (err) {
      console.warn("Supabase project delete failed, proceeding locally:", err);
    }

    try {
      const localOwned = JSON.parse(localStorage.getItem("tiny_wins_projects") || "[]");
      localStorage.setItem("tiny_wins_projects", JSON.stringify(localOwned.filter((p: any) => p.id !== project.id)));
      const localJoined = JSON.parse(localStorage.getItem("tiny_wins_joined_projects") || "[]");
      localStorage.setItem("tiny_wins_joined_projects", JSON.stringify(localJoined.filter((p: any) => p.id !== project.id)));
      localStorage.removeItem(`tiny_wins_notes_${project.id}`);
      localStorage.removeItem(`tiny_wins_project_${project.id}_files`);
    } catch {}

    navigate("/projects");
  };

  const handleLeaveClass = async () => {
    if (!project) return;
    const confirmed = window.confirm(`Are you sure you want to leave "${project.title}"?`);
    if (!confirmed) return;

    if (session?.user?.id) {
      try {
        await requireSupabase()
          .from("project_members")
          .delete()
          .eq("project_id", project.id)
          .eq("user_id", session.user.id);
      } catch (err) {
        console.warn("Supabase member delete failed, proceeding locally:", err);
      }
    }

    try {
      const localJoined = JSON.parse(localStorage.getItem("tiny_wins_joined_projects") || "[]");
      localStorage.setItem("tiny_wins_joined_projects", JSON.stringify(localJoined.filter((p: any) => p.id !== project.id)));
    } catch {}

    navigate("/projects");
  };

  const deleteNote = async (noteId: string) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;
    const confirmed = window.confirm(`Delete study material "${noteToDelete.title}"?`);
    if (!confirmed) return;

    // 1. Delete from Supabase notes table
    try {
      await requireSupabase().from("notes").delete().eq("id", noteId);
    } catch (e) {
      console.warn("Supabase note delete error:", e);
    }

    // 2. Remove from projects.materials JSONB array in Supabase
    if (project?.id) {
      try {
        const updatedMaterials = (project.materials || []).filter((m: any) => m.id !== noteId);
        await requireSupabase()
          .from("projects")
          .update({ materials: updatedMaterials })
          .eq("id", project.id);
      } catch (e) {
        console.warn("Supabase update project materials on delete error:", e);
      }
    }

    // 3. Remove from localStorage
    try {
      const localNotes: Note[] = JSON.parse(localStorage.getItem(`tiny_wins_notes_${projectId}`) || "[]");
      localStorage.setItem(
        `tiny_wins_notes_${projectId}`,
        JSON.stringify(localNotes.filter((n) => n.id !== noteId))
      );
    } catch {}

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setNotice("Study note deleted.");
    window.setTimeout(() => setNotice(""), 3000);
  };

  const loadFiles = async (id: string, memberIds: string[]) => {
    if (!session) return;
    try {
      const loaded = await fetchProjectFiles(id, memberIds);
      setFiles(loaded);
    } catch (err: any) {
      console.warn("Could not load project files:", err);
    }
  };

  useEffect(() => { void loadProjectData(); }, [projectId, session?.user.id]);

  const copyCode = async () => {
    if (!project?.join_code) return;
    await navigator.clipboard.writeText(project.join_code);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy code"), 1500);
  };

  const submitTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || taskSaving || !taskTitle.trim()) return;
    setTaskSaving(true); setError("");
    const input: TaskInput = { title: taskTitle.trim(), description: taskDescription.trim(), category: taskCategory, priority: taskPriority, dueDate: taskDueDate, dueTime: taskDueTime, project: projectId };
    try { await save(input); setTaskTitle(""); setTaskDescription(""); setTaskDueDate(""); setTaskDueTime(""); setShowTaskForm(false); setNotice("Task added to this project."); } catch (err: any) { console.error("Task submission failed:", err); setError(err?.message || err?.error_description || "Unable to add task."); } finally { setTaskSaving(false); }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId || !session || uploading) return;

    if (file.size === 0) {
      setError("The selected file appears empty (0 Bytes). Please choose a valid document or image.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploaderName = profile?.full_name || session?.user?.email?.split("@")[0] || "Instructor";
      const { file: storedFile, message } = await uploadProjectFile(
        projectId,
        session.user.id,
        file,
        uploaderName
      );

      // Immediate UI Feedback: Append new file to active files state array immediately
      setFiles((prev) => [
        storedFile,
        ...prev.filter((f) => f.name !== storedFile.name && f.id !== storedFile.id),
      ]);
      setNotice(message || "✅ File uploaded and secured!");
      window.setTimeout(() => setNotice(""), 4000);
    } catch (err: any) {
      console.error("File upload failed:", err);
      setError(`Unable to upload file: ${err?.message || err?.error_description || "Storage error"}`);
    } finally {
      // In the finally block, ALWAYS reset uploading = false so the button never stays stuck on "Uploading..."
      setUploading(false);
      event.target.value = "";
    }
  };

  const openFile = async (file: StoredFile) => {
    if (!projectId) return;

    let targetUrl = (file as any).data_url || file.metadata?.data_url || file.url || file.metadata?.url;

    if (!targetUrl) {
      try {
        const idbFiles: StoredFile[] = (await getFromIndexedDB(`tiny_wins_project_files_${projectId}`)) || [];
        const match = idbFiles.find((f) => f.name === file.name || f.id === file.id);
        if (match?.url || match?.data_url) {
          targetUrl = match.url || match.data_url;
        }
      } catch {}
    }

    if (!targetUrl && file.path) {
      try {
        const { data: pubData } = requireSupabase().storage.from("project-files").getPublicUrl(file.path);
        if (pubData?.publicUrl) targetUrl = pubData.publicUrl;
      } catch {}
    }

    if (targetUrl) {
      setPreview({ file, url: targetUrl });
      return;
    }

    setPreview({ file, url: "" });
  };

  const deleteFile = async (file: StoredFile) => {
    if (!projectId) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmed) return;

    setFiles((prev) => prev.filter((f) => f.name !== file.name && f.path !== file.path && f.id !== file.id));
    if (preview?.file.name === file.name || preview?.file.id === file.id) {
      setPreview(null);
    }
    try {
      await deleteProjectFile(projectId, file.name, file.path, file.id);
    } catch (err) {
      console.warn("Could not remove file:", err);
    }
    setNotice("File deleted.");
    window.setTimeout(() => setNotice(""), 3000);
  };

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId || noteSaving || !noteTitle.trim() || !noteContent.trim()) return;
    setNoteSaving(true);
    setError("");

    const newNoteId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `note-${Date.now()}`;
    const authorName = profile?.full_name || session?.user?.email?.split("@")[0] || "You";
    const newNote: Note = {
      id: newNoteId,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      author_id: session?.user?.id || "local-user",
      created_at: new Date().toISOString(),
      author: { full_name: authorName },
    };

    // 1. Insert into Supabase notes table
    try {
      if (session?.user?.id) {
        const { data, error: noteError } = await requireSupabase()
          .from("notes")
          .insert({
            project_id: projectId,
            author_id: session.user.id,
            title: noteTitle.trim(),
            content: noteContent.trim(),
          })
          .select("id")
          .maybeSingle();

        if (!noteError && data?.id) {
          newNote.id = data.id;
        }
      }
    } catch (e) {
      console.warn("Supabase note insert warning, saved locally:", e);
    }

    // 2. Dual-sync into projects row materials JSONB column in Supabase
    try {
      const currentMaterials = Array.isArray(project?.materials) ? project!.materials : [];
      const updatedMaterials = [newNote, ...currentMaterials.filter((m: any) => m.id !== newNote.id)];
      await requireSupabase()
        .from("projects")
        .update({ materials: updatedMaterials })
        .eq("id", projectId);
    } catch (e) {
      console.warn("Supabase update project materials JSONB warning:", e);
    }

    // 3. Mirror to localStorage
    try {
      const existingLocal: Note[] = JSON.parse(localStorage.getItem(`tiny_wins_notes_${projectId}`) || "[]");
      localStorage.setItem(
        `tiny_wins_notes_${projectId}`,
        JSON.stringify([newNote, ...existingLocal.filter((n) => n.id !== newNote.id)])
      );
    } catch (e) {
      console.error("Local note storage error:", e);
    }

    setNoteSaving(false);
    setNoteTitle("");
    setNoteContent("");
    setShowNoteForm(false);
    setNotice("Protected note added.");
    await loadProjectData();
  };

  if (loading) return <section className="p-5 text-zinc-500 lg:p-8">Loading project workspace...</section>;
  if (error && !project) return <section className="p-5 lg:p-8"><Link to="/projects" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16} /> Back to Projects</Link><div className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/10 p-6 text-sm text-red-200">{error}</div></section>;
  if (!project) return null;

  const activity = [
    ...projectTasks.map(task => ({ date: task.updatedAt || task.createdAt, text: `${task.completed ? "Completed" : "Updated"} task: ${task.title}` })),
    ...notes.map(note => ({ date: note.created_at, text: `Added note: ${note.title}` })),
    ...members.map(member => ({ date: member.joined_at, text: `Joined as ${member.role}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return <section className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.08),transparent_38%),radial-gradient(circle_at_top_left,rgba(139,92,246,.1),transparent_34%)] p-3.5 sm:p-5 lg:p-8">
    <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft size={16} /> Back to Projects</Link>
    <header className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl border border-white/[.08] bg-white/[.04] p-4 sm:p-6 shadow-2xl shadow-violet-950/10 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-cyan-300/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] uppercase tracking-[.16em] text-cyan-200">
              {project.type}
            </span>
            <span className="text-xs text-zinc-600">Created {formatDate(project.created_at)}</span>
          </div>
          <h1 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            {project.title}
          </h1>
          <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm leading-6 sm:leading-7 text-zinc-400">
            {project.description || "No description yet."}
          </p>
        </div>

        <div className="flex flex-col gap-2 min-w-[200px]">
          {/* Issue 2: Restrict Join Code visibility exclusively to Teacher / Project Creator */}
          {isCreator ? (
            <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3 sm:p-4">
              <p className="text-[10px] uppercase tracking-[.16em] text-violet-200 font-semibold">Join code</p>
              <div className="mt-1.5 sm:mt-2 flex items-center justify-between gap-2">
                <strong className="font-mono text-lg sm:text-xl tracking-wider text-white">
                  {project.join_code}
                </strong>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="button px-2.5 py-1 text-xs cursor-pointer"
                  title="Copy join code"
                >
                  <Clipboard size={14} />
                  <span className="sr-only">{copyLabel}</span>
                </button>
              </div>
              <p className="mt-1 text-[10px] sm:text-[11px] text-violet-200/70">{copyLabel}</p>
            </div>
          ) : (
            /* Student / Enrolled Member: Show classroom status badge instead of join code */
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-3 sm:p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[.16em] text-indigo-300 font-semibold">
                  Classroom Workspace
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-400/20 text-indigo-200 font-medium">
                  Enrolled
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white truncate mt-1">
                Instructor:{" "}
                <span className="text-cyan-300 font-semibold">
                  {ownerProfile?.full_name || members[0]?.profile?.full_name || "Lead Teacher"}
                </span>
              </p>
              <p className="text-[10px] text-indigo-200/70">Anti-screenshot protected workspace</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void syncMaterials()}
              disabled={syncing}
              className="button flex-1 inline-flex items-center justify-center gap-1.5 border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs px-3 py-1.5 hover:bg-cyan-400/20 transition cursor-pointer"
              title="Refresh & sync study materials from class"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Syncing..." : "Sync Materials"}</span>
            </button>
            {isCreator ? (
              <button
                type="button"
                onClick={() => void handleDeleteProject()}
                className="button inline-flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs px-3 py-1.5 hover:bg-rose-500/20 transition cursor-pointer"
                title="Delete project"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleLeaveClass()}
                className="button inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs px-3 py-1.5 hover:bg-amber-500/20 transition cursor-pointer"
                title="Leave class"
              >
                <LogOut size={13} />
                <span>Leave</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-4">
        <div className="min-w-[180px] sm:min-w-[220px] flex-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Project progress</span>
            <span className="text-zinc-200">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex gap-4 text-xs text-zinc-500">
          <span><b className="text-white">{completedCount}</b> done</span>
          <span><b className="text-white">{projectTasks.length - completedCount}</b> remaining</span>
        </div>
      </div>
    </header>

    {error && <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {notice && <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{notice}</p>}

    <nav className="mt-6 sm:mt-7 flex gap-1 overflow-x-auto no-scrollbar border-b border-white/[.08] -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
      {(["Overview", "Tasks", "Files", "Notes", "Members", "Activity"] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`whitespace-nowrap border-b-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition ${
            activeTab === tab ? "border-cyan-300 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>

    <div className="mt-6 max-w-6xl">
      {activeTab === "Overview" && <Overview project={project} tasks={projectTasks} members={members} activity={activity} progress={progress} />}
      {activeTab === "Tasks" && <TaskSection tasks={projectTasks} categories={categories} currentUserId={session?.user.id} showForm={showTaskForm} setShowForm={setShowTaskForm} onSubmit={submitTask} saving={taskSaving} title={taskTitle} setTitle={setTaskTitle} description={taskDescription} setDescription={setTaskDescription} category={taskCategory} setCategory={setTaskCategory} priority={taskPriority} setPriority={setTaskPriority} dueDate={taskDueDate} setDueDate={setTaskDueDate} dueTime={taskDueTime} setDueTime={setTaskDueTime} onToggle={task => void toggle(task)} onDelete={task => void remove(task.id)} />}
      {activeTab === "Files" && (
        <FilesSection
          files={files}
          uploading={uploading}
          onUpload={uploadFile}
          onOpen={(file) => void openFile(file)}
          onDelete={(file) => void deleteFile(file)}
          canDelete={isCreator}
          currentUserId={session?.user?.id}
        />
      )}
      {activeTab === "Notes" && (
        <NotesSection
          notes={notes}
          canAdd={Boolean(isCreator || profile?.role === "teacher")}
          isOwner={isCreator}
          currentUserId={session?.user.id}
          showForm={showNoteForm}
          setShowForm={setShowNoteForm}
          title={noteTitle}
          setTitle={setNoteTitle}
          content={noteContent}
          setContent={setNoteContent}
          saving={noteSaving}
          onSubmit={submitNote}
          onViewNote={note => setViewingNote(note)}
          onDeleteNote={noteId => void deleteNote(noteId)}
          onSync={() => void syncMaterials()}
          syncing={syncing}
        />
      )}
      {activeTab === "Members" && <MembersSection members={members} ownerId={project.owner_id} />}
      {activeTab === "Activity" && <ActivitySection activity={activity} />}
    </div>
    {preview && (
      <ProtectedContentViewer
        file={{
          ...preview.file,
          url: preview.url,
          name: preview.file.name,
          type: fileMimeType(preview.file),
          size: preview.file.metadata?.size || preview.file.size,
          uploader_name: preview.file.uploader_name || ownerProfile?.full_name || "Teacher",
        }}
        title={preview.file.name}
        type="file"
        fileUrl={preview.url}
        fileMimeType={fileMimeType(preview.file)}
        fileSize={preview.file.metadata?.size || preview.file.size}
        authorName={preview.file.uploader_name || ownerProfile?.full_name || "Teacher"}
        createdAt={preview.file.created_at ? formatDate(preview.file.created_at) : undefined}
        onClose={() => setPreview(null)}
        onDelete={() => void deleteFile(preview.file)}
      />
    )}
    {viewingNote && (
      <ProtectedContentViewer
        title={viewingNote.title}
        type="note"
        content={viewingNote.content}
        authorName={viewingNote.author?.full_name || "Project member"}
        createdAt={formatDate(viewingNote.created_at)}
        onClose={() => setViewingNote(null)}
      />
    )}
  </section>;
}

function Overview({ project, tasks, members, activity, progress }: { project: Project; tasks: ReturnType<typeof useTasks>["tasks"]; members: Member[]; activity: { date: string; text: string }[]; progress: number }) { return <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-6"><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Overview</p><h2 className="mt-3 text-xl font-medium text-white">A clear view of the work</h2><p className="mt-3 leading-7 text-zinc-400">{project.description || "This project does not have a description yet."}</p><div className="mt-7 grid grid-cols-3 gap-3"><Stat label="Total tasks" value={tasks.length} /><Stat label="Completed" value={tasks.filter(task => task.completed).length} /><Stat label="Progress" value={`${progress}%`} /></div></div><div className="space-y-5"><div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-6"><div className="flex items-center justify-between"><h2 className="font-medium text-white">Members</h2><Users size={17} className="text-cyan-300" /></div><p className="mt-3 text-3xl font-semibold text-white">{members.length}</p><p className="mt-1 text-xs text-zinc-600">People with access</p></div><ActivitySection activity={activity.slice(0, 4)} /></div></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-white/[.04] p-4"><p className="text-xs text-zinc-600">{label}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>; }
function ActivitySection({ activity }: { activity: { date: string; text: string }[] }) { return <div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-6"><h2 className="font-medium text-white">Recent activity</h2>{activity.length ? <div className="mt-5 space-y-4">{activity.map((item, index) => <div key={`${item.date}-${index}`} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" /><div><p className="text-zinc-300">{item.text}</p><p className="mt-1 text-xs text-zinc-600">{formatDate(item.date)}</p></div></div>)}</div> : <p className="mt-4 text-sm text-zinc-600">Activity will appear as the project moves forward.</p>}</div>; }

function TaskSection({ tasks, categories, currentUserId, showForm, setShowForm, onSubmit, saving, title, setTitle, description, setDescription, category, setCategory, priority, setPriority, dueDate, setDueDate, dueTime, setDueTime, onToggle, onDelete }: { tasks: ReturnType<typeof useTasks>["tasks"]; categories: { id: string; name: string }[]; currentUserId?: string; showForm: boolean; setShowForm: (value: boolean) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean; title: string; setTitle: (value: string) => void; description: string; setDescription: (value: string) => void; category: string; setCategory: (value: string) => void; priority: Priority; setPriority: (value: Priority) => void; dueDate: string; setDueDate: (value: string) => void; dueTime: string; setDueTime: (value: string) => void; onToggle: (task: ReturnType<typeof useTasks>["tasks"][number]) => void; onDelete: (task: ReturnType<typeof useTasks>["tasks"][number]) => void }) { return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project tasks</p><h2 className="mt-2 text-2xl font-medium text-white">Move the work forward</h2></div><button onClick={() => setShowForm(!showForm)} className="button inline-flex items-center gap-2 bg-violet-400 text-zinc-950 cursor-pointer"><Plus size={16} /> Add task</button></div>{showForm && <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5"><div className="grid gap-3 md:grid-cols-2"><input className="field md:col-span-2" required placeholder="Task title" value={title} onChange={event => setTitle(event.target.value)} /><textarea className="field min-h-20 md:col-span-2" placeholder="Description" value={description} onChange={event => setDescription(event.target.value)} /><select className="field" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}</select><select className="field" value={priority} onChange={event => setPriority(event.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select><input className="field" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /><input className="field" type="time" value={dueTime} onChange={event => setDueTime(event.target.value)} /></div><div className="mt-4 flex gap-2"><button disabled={saving} className="button bg-white text-zinc-950 disabled:opacity-50 cursor-pointer">{saving ? "Adding..." : "Add task"}</button><button type="button" onClick={() => setShowForm(false)} className="button cursor-pointer">Cancel</button></div></form>}<div className="mt-5 space-y-2">{tasks.length ? tasks.map(task => <div key={task.id} className={`flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.035] p-4 ${task.completed ? "opacity-60" : ""}`}><button onClick={() => onToggle(task)} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${task.completed ? "border-white bg-white text-black" : "border-zinc-700 text-transparent hover:border-zinc-300"} cursor-pointer`} aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}><Check size={13} /></button><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.completed ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{task.title}</p><p className="mt-1 text-xs text-zinc-600">{task.category}{task.dueDate ? ` · Due ${task.dueDate}` : ""}</p></div><span className="hidden text-xs text-zinc-500 sm:block">{task.priority}</span>{task.ownerId === currentUserId && <button onClick={() => onDelete(task)} className="text-xs text-zinc-600 hover:text-red-300 cursor-pointer">Delete</button>}</div>) : <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center"><Check className="mx-auto text-zinc-700" size={24} /><p className="mt-3 text-sm text-zinc-500">No tasks in this project yet.</p></div>}</div></div>; }

const fileMimeType = (file: StoredFile) =>
  file.metadata?.mimetype ||
  file.mimetype ||
  file.type ||
  ({
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
  }[file.name.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream");

function FilesSection({
  files,
  uploading,
  onUpload,
  onOpen,
  onDelete,
  canDelete,
  currentUserId,
}: {
  files: StoredFile[];
  uploading: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpen: (file: StoredFile) => void;
  onDelete: (file: StoredFile) => void;
  canDelete?: boolean;
  currentUserId?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] text-zinc-600 font-medium">Shared Course Files</p>
          <h2 className="mt-2 text-2xl font-medium text-white">Project Files Shelf</h2>
          <p className="mt-1 text-xs text-zinc-400">
            All course files and study PDFs are synced across accounts and protected against unauthorized copying.
          </p>
        </div>
        <label className="button inline-flex cursor-pointer items-center gap-2 bg-violet-400 text-zinc-950 font-medium hover:bg-violet-300 transition shadow-md">
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload file"}
          <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      <div className="mt-5 space-y-2">
        {files.length ? (
          files.map((file) => {
            const isUserOwner = Boolean(canDelete || (file.uploader_id && file.uploader_id === currentUserId));

            return (
              <div
                key={file.id ?? file.path}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-white/[.035] p-4 hover:border-white/15 transition shadow-sm"
              >
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onOpen(file)}
                >
                  <FileText size={22} className="text-cyan-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200 font-medium group-hover:text-cyan-200 transition">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 flex flex-wrap items-center gap-1.5">
                      <span>{fileMimeType(file)}</span>
                      <span>·</span>
                      <span>{formatBytes(file.metadata?.size || file.size)}</span>
                      <span>·</span>
                      <span>{file.created_at || file.uploaded_at ? formatDate(file.created_at || file.uploaded_at!) : "Uploaded"}</span>
                      {file.uploader_name && (
                        <>
                          <span>·</span>
                          <span className="text-zinc-400">By {file.uploader_name}</span>
                        </>
                      )}
                      {file.isLocalFallback && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                          Local Backup
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onOpen(file)}
                    className="button inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 transition cursor-pointer"
                    title="Open in protected study viewer"
                  >
                    <Lock size={12} />
                    <span>Protected View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(file)}
                    className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition cursor-pointer"
                    title="Delete file"
                    aria-label="Delete file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center">
            <FolderOpen className="mx-auto text-zinc-700" size={26} />
            <p className="mt-3 text-sm text-zinc-500">No files uploaded to this project yet.</p>
            <p className="mt-1 text-xs text-zinc-600">Files uploaded by the instructor appear here for all enrolled students.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesSection({
  notes,
  canAdd,
  isOwner,
  currentUserId,
  showForm,
  setShowForm,
  title,
  setTitle,
  content,
  setContent,
  saving,
  onSubmit,
  onViewNote,
  onDeleteNote,
  onSync,
  syncing,
}: {
  notes: Note[];
  canAdd: boolean;
  isOwner: boolean;
  currentUserId?: string;
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  saving: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onViewNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.16em] text-zinc-600 font-medium">Project study materials</p>
          <h2 className="mt-2 text-2xl font-medium text-white">Protected course notes & materials</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="button inline-flex items-center gap-1.5 border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs px-3 py-2 hover:bg-cyan-400/20 transition cursor-pointer"
            title="Refresh materials from server"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Materials"}</span>
          </button>
          {canAdd && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="button inline-flex items-center gap-2 bg-violet-400 text-zinc-950 cursor-pointer"
            >
              <Plus size={16} /> Add material
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5">
          <input
            className="field"
            required
            placeholder="Material / Note title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="field mt-3 min-h-32"
            required
            placeholder="Write protected study notes, questions, or syllabus content..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <div className="mt-4 flex gap-2">
            <button disabled={saving} className="button bg-white text-zinc-950 disabled:opacity-50 cursor-pointer">
              {saving ? "Saving..." : "Save material"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="button cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {notes.length ? (
          notes.map((note) => (
            <article
              key={note.id}
              className="group relative rounded-2xl border border-white/[.07] bg-white/[.035] p-5 transition hover:border-violet-400/40 hover:bg-white/[.05]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-white">{note.title}</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewNote(note)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-400/20 cursor-pointer"
                    title="Open protected viewer"
                  >
                    <Lock size={11} /> Protected View
                  </button>
                  {(isOwner || note.author_id === currentUserId) && (
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400 transition cursor-pointer"
                      title="Delete study note"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                {note.content}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-zinc-600">
                <span>{note.author?.full_name || "Project member"} · {formatDate(note.created_at)}</span>
                <span className="text-[11px] text-zinc-500">Anti-screenshot protected</span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center md:col-span-2">
            <FileText className="mx-auto text-zinc-700" size={26} />
            <p className="mt-3 text-sm text-zinc-500">No study notes or materials have been added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MembersSection({ members, ownerId }: { members: Member[]; ownerId: string }) { return <div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project members</p><h2 className="mt-2 text-2xl font-medium text-white">People in this workspace</h2><div className="mt-5 space-y-2">{members.map(member => <div key={member.user_id} className="flex items-center gap-4 rounded-xl border border-white/[.07] bg-white/[.035] p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-300/10 text-sm text-violet-200">{(member.profile?.full_name || "U").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="text-sm text-zinc-200">{member.profile?.full_name || "Project member"}</p><p className="truncate text-xs text-zinc-600">{member.profile?.email || "Email unavailable"}</p></div><span className="text-right text-xs capitalize text-zinc-500">{member.user_id === ownerId ? "Owner" : member.role}<br /><span className="text-zinc-700">Joined {formatDate(member.joined_at)}</span></span></div>)}{!members.length && <p className="text-sm text-zinc-600">No member records are available.</p>}</div></div>; }
