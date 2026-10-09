import { useEffect, useState } from "react";
import { ArrowUpRight, FolderKanban, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requireSupabase } from "../lib/supabase";

type Project = { id: string; title: string; description: string; type: string; join_code: string; owner_id: string };

export default function ProjectsPage() {
	const { session, profile } = useAuth();
	const [projects, setProjects] = useState<Project[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [code, setCode] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const load = async () => {
		setLoading(true);
		const { data, error } = await requireSupabase().from("projects").select("id,title,description,type,join_code,owner_id").order("created_at", { ascending: false });
		setLoading(false);
		if (error) setMessage(`Unable to load projects: ${error.message}`);
		else setProjects(data ?? []);
	};

	useEffect(() => { void load(); }, []);

	const create = async (event: React.FormEvent) => {
		event.preventDefault();
		if (saving) return;
		setSaving(true); setMessage("");
		const join = `${title.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "JOIN"}-${Math.floor(1000 + Math.random() * 9000)}`;
		const { error } = await requireSupabase().from("projects").insert({ owner_id: session!.user.id, title: title.trim(), description: description.trim(), type: profile?.role === "teacher" ? "class" : "personal", join_code: join });
		setSaving(false);
		if (error) setMessage(`Unable to create project: ${error.message}`);
		else { setTitle(""); setDescription(""); setMessage("Project created."); void load(); }
	};

	const join = async (event: React.FormEvent) => {
		event.preventDefault();
		if (saving) return;
		setSaving(true); setMessage("");
		const { data, error } = await requireSupabase().from("projects").select("id").eq("join_code", code.trim().toUpperCase()).single();
		if (error || !data) { setSaving(false); setMessage(error ? `That join code was not found: ${error.message}` : "That join code was not found."); return; }
		const { error: joinError } = await requireSupabase().from("project_members").upsert({ project_id: data.id, user_id: session!.user.id, role: "student" }, { onConflict: "project_id,user_id" });
		setSaving(false); setMessage(joinError ? `Unable to join this project: ${joinError.message}` : "You joined the project.");
		if (!joinError) { setCode(""); void load(); }
	};

	return <section className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.08),transparent_35%),radial-gradient(circle_at_top_left,rgba(139,92,246,.1),transparent_32%)] p-5 lg:p-8">
		<div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-violet-300"><FolderKanban size={14} /> Shared focus</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Projects</h1><p className="mt-2 max-w-xl text-zinc-500">A calmer home for the work you are building together.</p></div><div className="rounded-full border border-white/[.08] bg-white/[.04] px-4 py-2 text-sm text-zinc-300"><Users size={15} className="mr-2 inline text-cyan-300" />{projects.length} {projects.length === 1 ? "project" : "projects"}</div></div>
		{message && <p className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-3 text-sm text-violet-100">{message}</p>}
		<div className="mt-8 grid gap-5 lg:grid-cols-2"><form onSubmit={create} className="rounded-2xl border border-white/[.08] bg-white/[.04] p-6 shadow-2xl shadow-violet-950/10"><p className="text-xs uppercase tracking-[.16em] text-zinc-500">Start fresh</p><h2 className="mt-2 text-lg font-medium text-white">Create a project</h2><input className="field mt-5" required placeholder="Project title" value={title} onChange={event => setTitle(event.target.value)} /><textarea className="field mt-3 min-h-24" placeholder="Description" value={description} onChange={event => setDescription(event.target.value)} /><button disabled={saving} className="button mt-4 inline-flex items-center gap-2 bg-violet-400 text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />{saving ? "Saving..." : "Create project"}</button></form>{profile?.role === "student" && <form onSubmit={join} className="rounded-2xl border border-white/[.08] bg-white/[.04] p-6"><p className="text-xs uppercase tracking-[.16em] text-zinc-500">Have an invitation?</p><h2 className="mt-2 text-lg font-medium text-white">Join a class</h2><input className="field mt-5" required placeholder="MATH-4821" value={code} onChange={event => setCode(event.target.value)} /><button disabled={saving} className="button mt-4 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Joining..." : "Join with code"}</button></form>}</div>
		{loading ? <p className="mt-10 text-sm text-zinc-500">Loading your projects...</p> : projects.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/[.12] px-6 py-14 text-center"><FolderKanban className="mx-auto text-zinc-600" size={30} /><h2 className="mt-4 text-lg text-white">Your next tiny win starts here</h2><p className="mt-2 text-sm text-zinc-500">Create a project or join one with a code.</p></div> : <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map(project => <Link key={project.id} to={`/projects/${project.id}`} className="group rounded-2xl border border-white/[.08] bg-white/[.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[.06] hover:shadow-xl hover:shadow-cyan-950/20"><div className="flex items-start justify-between gap-4"><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.14em] text-cyan-200">{project.type}</span><ArrowUpRight size={18} className="text-zinc-600 transition group-hover:text-cyan-200" /></div><h2 className="mt-5 text-xl font-medium text-white">{project.title}</h2><p className="mt-2 min-h-10 text-sm leading-6 text-zinc-500">{project.description || "No description yet."}</p>{project.owner_id === session?.user.id && <p className="mt-5 text-xs text-zinc-500">Join code: <span className="select-all text-violet-200">{project.join_code}</span></p>}<span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition group-hover:text-white">Open Project <ArrowUpRight size={14} /></span></Link>)}</div>}
	</section>;
}
