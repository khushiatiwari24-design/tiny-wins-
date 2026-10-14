import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clipboard, FileText, FolderOpen, Lock, Plus, Upload, Users, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { requireSupabase } from "../lib/supabase";
import type { Priority, TaskInput } from "../types/task";
import ProtectedContentViewer from "../components/projects/ProtectedContentViewer";

type Project = { id: string; title: string; description: string; type: string; join_code: string; owner_id: string; created_at: string };
type Member = { user_id: string; role: string; joined_at: string; profile: { full_name: string; email: string } | null };
type Note = { id: string; title: string; content: string; author_id: string; created_at: string; author: { full_name: string } | null };
type StoredFile = { name: string; path: string; id: string | null; metadata?: { mimetype?: string; size?: number }; created_at?: string };
type Tab = "Overview" | "Tasks" | "Files" | "Notes" | "Members" | "Activity";

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatBytes = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { session, profile } = useAuth();
  const { tasks: allTasks, categories, save, remove, toggle } = useTasks(session?.user.id, projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
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

  const projectTasks = useMemo(() => allTasks.filter(task => task.projectId === projectId), [allTasks, projectId]);
  const completedCount = projectTasks.filter(task => task.completed).length;
  const progress = projectTasks.length ? Math.round(completedCount / projectTasks.length * 100) : 0;
  const isOwner = project?.owner_id === session?.user.id;

  const loadProjectData = async () => {
    if (!projectId) { setError("This project link is missing its project ID."); setLoading(false); return; }
    setLoading(true); setError("");
    const db = requireSupabase();

    let projectData: any = null;
    let ownerProfile: any = null;
    let membersData: any[] = [];
    let notesData: any[] = [];

    try {
      const [projectResult, membersResult, notesResult] = await Promise.all([
        db.from("projects").select("id,title,description,type,join_code,owner_id,created_at").eq("id", projectId).maybeSingle(),
        db.from("project_members").select("user_id,role,joined_at,profiles(full_name,email)").eq("project_id", projectId).order("joined_at"),
        db.from("notes").select("id,title,content,author_id,created_at,profiles(full_name)").eq("project_id", projectId).order("created_at", { ascending: false }),
      ]);

      if (projectResult?.data) {
        projectData = projectResult.data;
        const ownerProfileResult = await db.from("profiles").select("full_name,email").eq("id", projectData.owner_id).maybeSingle();
        ownerProfile = ownerProfileResult?.data || null;
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
      setLoading(false);
      setError("This project was not found or you do not have access to it.");
      return;
    }

    setProject(projectData as Project);

    // Load local notes for this project
    let localNotes: Note[] = [];
    try {
      const stored = localStorage.getItem(`tiny_wins_notes_${projectId}`);
      if (stored) localNotes = JSON.parse(stored);
    } catch (err) {
      console.error("Local notes read error:", err);
    }

    const fetchedNotes: Note[] = notesData.map((row) => ({
      ...row,
      author: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
    }));

    const notesMap = new Map<string, Note>();
    fetchedNotes.forEach((n) => notesMap.set(n.id, n));
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
        profile: ownerProfile || { full_name: "Project Lead", email: "" },
      },
      ...joinedMembers,
    ]);

    setLoading(false);

    try {
      await loadFiles(projectId, [projectData.owner_id, ...membersData.map((member) => member.user_id)]);
    } catch {}
  };

  const loadFiles = async (id: string, memberIds: string[]) => {
    if (!session) return;
    const results = await Promise.all([...new Set(memberIds)].map(async memberId => {
      const folder = `${id}/${memberId}`;
      const result = await requireSupabase().storage.from("project-files").list(folder, { sortBy: { column: "created_at", order: "desc" } });
      return { folder, ...result };
    }));
    const failed = results.find(result => result.error);
    if (failed?.error) { setError(`Unable to load project files: ${failed.error.message}`); return; }
    setFiles(results.flatMap(result => (result.data ?? []).filter(file => file.name !== ".emptyFolderPlaceholder").map(file => ({ ...file, path: `${result.folder}/${file.name}` })) as StoredFile[]));
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
    setUploading(true); setError("");
    const path = `${projectId}/${session.user.id}/${Date.now()}-${file.name}`;
    try {
      const uploadRequest = requireSupabase().storage.from("project-files").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      const timeout = new Promise<{ error: { message: string } }>((resolve) => window.setTimeout(() => resolve({ error: { message: "The upload timed out. Check your connection and confirm the project-files bucket exists in Supabase." } }), 30000));
      const { error: uploadError } = await Promise.race([uploadRequest, timeout]);
      if (uploadError) {
        const storageMessage = uploadError.message === "Bucket not found"
          ? "The project-files bucket is missing. Run supabase/project-files-storage.sql in the Supabase SQL Editor, then try again."
          : uploadError.message;
        setError(`Unable to upload file: ${storageMessage}`);
        return;
      }
      setNotice("File uploaded.");
      await loadProjectData();
    } catch (err: any) {
      console.error("File upload failed:", err);
      setError(`Unable to upload file: ${err?.message || err?.error_description || "Supabase Storage is unavailable."}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const openFile = async (file: StoredFile) => {
    if (!projectId || !session) return;
    const { data, error: downloadError } = await requireSupabase().storage.from("project-files").createSignedUrl(file.path, 3600);
    if (downloadError) setError(`Unable to preview file: ${downloadError.message}`);
    else if (data?.signedUrl) setPreview({ file, url: data.signedUrl });
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

    // Always mirror to localStorage
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
    <header className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl border border-white/[.08] bg-white/[.04] p-4 sm:p-6 shadow-2xl shadow-violet-950/10 lg:p-8"><div className="flex flex-wrap items-start justify-between gap-4 sm:gap-5"><div><div className="flex flex-wrap items-center gap-2 sm:gap-3"><span className="rounded-full bg-cyan-300/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] uppercase tracking-[.16em] text-cyan-200">{project.type}</span><span className="text-xs text-zinc-600">Created {formatDate(project.created_at)}</span></div><h1 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-white lg:text-4xl">{project.title}</h1><p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm leading-6 sm:leading-7 text-zinc-400">{project.description || "No description yet."}</p></div><div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3 sm:p-4"><p className="text-[10px] uppercase tracking-[.16em] text-violet-200">Join code</p><div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3"><strong className="font-mono text-lg sm:text-xl tracking-wider text-white">{project.join_code}</strong><button onClick={() => void copyCode()} className="button px-2 py-1 text-xs" title="Copy join code"><Clipboard size={14} /> <span className="sr-only">{copyLabel}</span></button></div><p className="mt-1 text-[10px] sm:text-[11px] text-violet-200/70">{copyLabel}</p></div></div><div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-4"><div className="min-w-[180px] sm:min-w-[220px] flex-1"><div className="flex justify-between text-xs"><span className="text-zinc-500">Project progress</span><span className="text-zinc-200">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div></div><div className="flex gap-4 text-xs text-zinc-500"><span><b className="text-white">{completedCount}</b> done</span><span><b className="text-white">{projectTasks.length - completedCount}</b> remaining</span></div></div></header>
    {error && <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p>}{notice && <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{notice}</p>}
    <nav className="mt-6 sm:mt-7 flex gap-1 overflow-x-auto no-scrollbar border-b border-white/[.08] -mx-3.5 px-3.5 sm:mx-0 sm:px-0">{(["Overview", "Tasks", "Files", "Notes", "Members", "Activity"] as Tab[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition ${activeTab === tab ? "border-cyan-300 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>{tab}</button>)}</nav>
    <div className="mt-6 max-w-6xl">
      {activeTab === "Overview" && <Overview project={project} tasks={projectTasks} members={members} activity={activity} progress={progress} />}
      {activeTab === "Tasks" && <TaskSection tasks={projectTasks} categories={categories} currentUserId={session?.user.id} showForm={showTaskForm} setShowForm={setShowTaskForm} onSubmit={submitTask} saving={taskSaving} title={taskTitle} setTitle={setTaskTitle} description={taskDescription} setDescription={setTaskDescription} category={taskCategory} setCategory={setTaskCategory} priority={taskPriority} setPriority={setTaskPriority} dueDate={taskDueDate} setDueDate={setTaskDueDate} dueTime={taskDueTime} setDueTime={setTaskDueTime} onToggle={task => void toggle(task)} onDelete={task => void remove(task.id)} />}
      {activeTab === "Files" && <FilesSection files={files} uploading={uploading} onUpload={uploadFile} onOpen={file => void openFile(file)} />}
      {activeTab === "Notes" && <NotesSection notes={notes} canAdd={Boolean(isOwner || profile?.role === "teacher")} showForm={showNoteForm} setShowForm={setShowNoteForm} title={noteTitle} setTitle={setNoteTitle} content={noteContent} setContent={setNoteContent} saving={noteSaving} onSubmit={submitNote} onViewNote={note => setViewingNote(note)} />}
      {activeTab === "Members" && <MembersSection members={members} ownerId={project.owner_id} />}
      {activeTab === "Activity" && <ActivitySection activity={activity} />}
    </div>
    {preview && (
      <ProtectedContentViewer
        title={preview.file.name}
        type="file"
        fileUrl={preview.url}
        fileMimeType={fileMimeType(preview.file)}
        createdAt={preview.file.created_at ? formatDate(preview.file.created_at) : undefined}
        onClose={() => setPreview(null)}
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

function TaskSection({ tasks, categories, currentUserId, showForm, setShowForm, onSubmit, saving, title, setTitle, description, setDescription, category, setCategory, priority, setPriority, dueDate, setDueDate, dueTime, setDueTime, onToggle, onDelete }: { tasks: ReturnType<typeof useTasks>["tasks"]; categories: { id: string; name: string }[]; currentUserId?: string; showForm: boolean; setShowForm: (value: boolean) => void; onSubmit: (event: React.FormEvent) => void; saving: boolean; title: string; setTitle: (value: string) => void; description: string; setDescription: (value: string) => void; category: string; setCategory: (value: string) => void; priority: Priority; setPriority: (value: Priority) => void; dueDate: string; setDueDate: (value: string) => void; dueTime: string; setDueTime: (value: string) => void; onToggle: (task: ReturnType<typeof useTasks>["tasks"][number]) => void; onDelete: (task: ReturnType<typeof useTasks>["tasks"][number]) => void }) { return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project tasks</p><h2 className="mt-2 text-2xl font-medium text-white">Move the work forward</h2></div><button onClick={() => setShowForm(!showForm)} className="button inline-flex items-center gap-2 bg-violet-400 text-zinc-950"><Plus size={16} /> Add task</button></div>{showForm && <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5"><div className="grid gap-3 md:grid-cols-2"><input className="field md:col-span-2" required placeholder="Task title" value={title} onChange={event => setTitle(event.target.value)} /><textarea className="field min-h-20 md:col-span-2" placeholder="Description" value={description} onChange={event => setDescription(event.target.value)} /><select className="field" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}</select><select className="field" value={priority} onChange={event => setPriority(event.target.value as Priority)}><option>High</option><option>Medium</option><option>Low</option></select><input className="field" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /><input className="field" type="time" value={dueTime} onChange={event => setDueTime(event.target.value)} /></div><div className="mt-4 flex gap-2"><button disabled={saving} className="button bg-white text-zinc-950 disabled:opacity-50">{saving ? "Adding..." : "Add task"}</button><button type="button" onClick={() => setShowForm(false)} className="button">Cancel</button></div></form>}<div className="mt-5 space-y-2">{tasks.length ? tasks.map(task => <div key={task.id} className={`flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.035] p-4 ${task.completed ? "opacity-60" : ""}`}><button onClick={() => onToggle(task)} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${task.completed ? "border-white bg-white text-black" : "border-zinc-700 text-transparent hover:border-zinc-300"}`} aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}><Check size={13} /></button><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${task.completed ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{task.title}</p><p className="mt-1 text-xs text-zinc-600">{task.category}{task.dueDate ? ` · Due ${task.dueDate}` : ""}</p></div><span className="hidden text-xs text-zinc-500 sm:block">{task.priority}</span>{task.ownerId === currentUserId && <button onClick={() => onDelete(task)} className="text-xs text-zinc-600 hover:text-red-300">Delete</button>}</div>) : <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center"><Check className="mx-auto text-zinc-700" size={24} /><p className="mt-3 text-sm text-zinc-500">No tasks in this project yet.</p></div>}</div></div>; }

const fileMimeType = (file: StoredFile) => file.metadata?.mimetype || ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", txt: "text/plain", csv: "text/csv", json: "application/json", mp3: "audio/mpeg", mp4: "video/mp4" }[file.name.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream");
const isImageFile = (file: StoredFile) => fileMimeType(file).startsWith("image/");
const isPdfFile = (file: StoredFile) => fileMimeType(file) === "application/pdf";
const isBrowserPreviewable = (file: StoredFile) => isImageFile(file) || isPdfFile(file) || fileMimeType(file).startsWith("text/") || fileMimeType(file) === "application/json" || fileMimeType(file).startsWith("audio/") || fileMimeType(file).startsWith("video/");

function FilesSection({ files, uploading, onUpload, onOpen }: { files: StoredFile[]; uploading: boolean; onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; onOpen: (file: StoredFile) => void }) { return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project files</p><h2 className="mt-2 text-2xl font-medium text-white">A shared shelf for the useful things</h2></div><label className="button inline-flex cursor-pointer items-center gap-2 bg-violet-400 text-zinc-950"><Upload size={16} /> {uploading ? "Uploading..." : "Upload file"}<input type="file" className="hidden" onChange={onUpload} disabled={uploading} /></label></div><div className="mt-5 space-y-2">{files.length ? files.map(file => <div key={file.id ?? file.path} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.035] p-4"><FileText size={20} className="text-cyan-300" /><div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-200">{file.name}</p><p className="mt-1 text-xs text-zinc-600">{fileMimeType(file)} · {formatBytes(file.metadata?.size)} · {file.created_at ? formatDate(file.created_at) : "Uploaded"}</p></div>{isBrowserPreviewable(file) && <button onClick={() => onOpen(file)} className="button px-3 py-2 text-xs">{isImageFile(file) || isPdfFile(file) ? "Preview" : "Open"}</button>}</div>) : <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center"><FolderOpen className="mx-auto text-zinc-700" size={26} /><p className="mt-3 text-sm text-zinc-500">No files uploaded to this project.</p></div>}</div></div>; }

function FilePreview({ file, url, onClose }: { file: StoredFile; url: string; onClose: () => void }) { const mimeType = fileMimeType(file); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#111114] shadow-2xl"><div className="flex items-center gap-4 border-b border-white/[.08] px-5 py-4"><FileText size={18} className="text-cyan-300" /><p className="min-w-0 flex-1 truncate text-sm text-white">{file.name}</p><button onClick={onClose} className="button p-2" aria-label="Close preview"><X size={16} /></button></div><div className="min-h-0 overflow-auto bg-black/30 p-4">{isImageFile(file) ? <img src={url} alt={file.name} className="mx-auto max-h-[72vh] max-w-full object-contain" /> : isPdfFile(file) ? <iframe src={url} title={file.name} className="h-[72vh] w-full rounded-lg bg-white" /> : mimeType.startsWith("audio/") ? <audio src={url} controls className="mx-auto mt-16 w-full max-w-xl" /> : mimeType.startsWith("video/") ? <video src={url} controls className="mx-auto max-h-[72vh] max-w-full" /> : <iframe src={url} title={file.name} className="h-[72vh] w-full rounded-lg bg-white" />}</div></div></div>; }

function NotesSection({ notes, canAdd, showForm, setShowForm, title, setTitle, content, setContent, saving, onSubmit, onViewNote }: { notes: Note[]; canAdd: boolean; showForm: boolean; setShowForm: (value: boolean) => void; title: string; setTitle: (value: string) => void; content: string; setContent: (value: string) => void; saving: boolean; onSubmit: (event: React.FormEvent) => void; onViewNote: (note: Note) => void }) { return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project notes</p><h2 className="mt-2 text-2xl font-medium text-white">Keep the context close</h2></div>{canAdd && <button onClick={() => setShowForm(!showForm)} className="button inline-flex items-center gap-2 bg-violet-400 text-zinc-950"><Plus size={16} /> Add note</button>}</div>{showForm && <form onSubmit={onSubmit} className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5"><input className="field" required placeholder="Note title" value={title} onChange={event => setTitle(event.target.value)} /><textarea className="field mt-3 min-h-32" required placeholder="Write a useful note..." value={content} onChange={event => setContent(event.target.value)} /><div className="mt-4 flex gap-2"><button disabled={saving} className="button bg-white text-zinc-950 disabled:opacity-50">{saving ? "Saving..." : "Save note"}</button><button type="button" onClick={() => setShowForm(false)} className="button">Cancel</button></div></form>}<div className="mt-5 grid gap-4 md:grid-cols-2">{notes.length ? notes.map(note => <article key={note.id} className="group relative rounded-2xl border border-white/[.07] bg-white/[.035] p-5 transition hover:border-violet-400/40 hover:bg-white/[.05]"><div className="flex items-start justify-between gap-2"><h3 className="font-medium text-white">{note.title}</h3><button onClick={() => onViewNote(note)} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-400/20" title="Open protected viewer"><Lock size={11} /> Protected View</button></div><p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{note.content}</p><div className="mt-5 flex items-center justify-between text-xs text-zinc-600"><span>{note.author?.full_name || "Project member"} · {formatDate(note.created_at)}</span><span className="text-[11px] text-zinc-500">Anti-screenshot protected</span></div></article>) : <div className="rounded-2xl border border-dashed border-white/[.1] px-6 py-12 text-center md:col-span-2"><FileText className="mx-auto text-zinc-700" size={26} /><p className="mt-3 text-sm text-zinc-500">No notes have been added yet.</p></div>}</div></div>; }

function MembersSection({ members, ownerId }: { members: Member[]; ownerId: string }) { return <div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Project members</p><h2 className="mt-2 text-2xl font-medium text-white">People in this workspace</h2><div className="mt-5 space-y-2">{members.map(member => <div key={member.user_id} className="flex items-center gap-4 rounded-xl border border-white/[.07] bg-white/[.035] p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-300/10 text-sm text-violet-200">{(member.profile?.full_name || "U").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="text-sm text-zinc-200">{member.profile?.full_name || "Project member"}</p><p className="truncate text-xs text-zinc-600">{member.profile?.email || "Email unavailable"}</p></div><span className="text-right text-xs capitalize text-zinc-500">{member.user_id === ownerId ? "Owner" : member.role}<br /><span className="text-zinc-700">Joined {formatDate(member.joined_at)}</span></span></div>)}{!members.length && <p className="text-sm text-zinc-600">No member records are available.</p>}</div></div>; }
