import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, FolderKanban, LogOut, Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requireSupabase } from "../lib/supabase";

type Project = {
	id: string;
	title: string;
	description: string;
	type: string;
	join_code: string;
	owner_id: string;
	created_at?: string;
	materials?: any[];
};

const LOCAL_PROJECTS_KEY = "tiny_wins_projects";
const LOCAL_JOINED_PROJECTS_KEY = "tiny_wins_joined_projects";

function getLocalProjects(): Project[] {
	try {
		const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveLocalProjects(projects: Project[]) {
	try {
		localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
	} catch (e) {
		console.error("Failed to save local projects", e);
	}
}

function getLocalJoinedProjects(): Project[] {
	try {
		const raw = localStorage.getItem(LOCAL_JOINED_PROJECTS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveLocalJoinedProjects(projects: Project[]) {
	try {
		localStorage.setItem(LOCAL_JOINED_PROJECTS_KEY, JSON.stringify(projects));
	} catch (e) {
		console.error("Failed to save local joined projects", e);
	}
}

export default function ProjectsPage() {
	const { session, profile } = useAuth();
	const [projects, setProjects] = useState<Project[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [code, setCode] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		const allMap = new Map<string, Project>();

		try {
			// 1. Fetch created or visible projects from Supabase
			const { data: dbProjects, error } = await requireSupabase()
				.from("projects")
				.select("id,title,description,type,join_code,owner_id,created_at,materials")
				.order("created_at", { ascending: false });

			if (!error && dbProjects) {
				dbProjects.forEach((p) => allMap.set(p.id, p));
			}

			// 2. Fetch projects user joined as a member
			if (session?.user?.id) {
				const { data: memberRows } = await requireSupabase()
					.from("project_members")
					.select("project:projects(id,title,description,type,join_code,owner_id,created_at,materials)")
					.eq("user_id", session.user.id);

				if (memberRows) {
					memberRows.forEach((row: any) => {
						const proj = Array.isArray(row.project) ? row.project[0] : row.project;
						if (proj?.id) {
							allMap.set(proj.id, proj);
						}
					});
				}
			}
		} catch (err) {
			console.warn("Supabase project load error, proceeding with local cache:", err);
		}

		// 3. Merge locally owned and joined projects
		const localOwned = getLocalProjects();
		const localJoined = getLocalJoinedProjects();

		localOwned.forEach((p) => {
			if (!allMap.has(p.id)) allMap.set(p.id, p);
		});
		localJoined.forEach((p) => {
			if (!allMap.has(p.id)) allMap.set(p.id, p);
		});

		setProjects(Array.from(allMap.values()));
		setLoading(false);
	};

	useEffect(() => {
		void load();
	}, [session?.user?.id]);

	const copyCodeToClipboard = async (e: React.MouseEvent, project: Project) => {
		e.preventDefault();
		e.stopPropagation();
		if (!project.join_code) return;
		try {
			await navigator.clipboard.writeText(project.join_code);
			setCopiedId(project.id);
			setTimeout(() => setCopiedId(null), 2000);
		} catch {
			// fallback
		}
	};

	const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
		e.preventDefault();
		e.stopPropagation();
		const confirmed = window.confirm(
			`Are you sure you want to delete "${project.title}"? This will permanently delete the project and all notes/materials.`
		);
		if (!confirmed) return;

		try {
			await requireSupabase().from("projects").delete().eq("id", project.id);
		} catch (err) {
			console.warn("Supabase project delete failed, proceeding locally:", err);
		}

		// Clean from local storage
		const localOwned = getLocalProjects().filter((p) => p.id !== project.id);
		saveLocalProjects(localOwned);
		const localJoined = getLocalJoinedProjects().filter((p) => p.id !== project.id);
		saveLocalJoinedProjects(localJoined);
		localStorage.removeItem(`tiny_wins_notes_${project.id}`);

		setProjects((prev) => prev.filter((p) => p.id !== project.id));
		setMessage(`Deleted project "${project.title}".`);
	};

	const handleLeaveClass = async (e: React.MouseEvent, project: Project) => {
		e.preventDefault();
		e.stopPropagation();
		const confirmed = window.confirm(
			`Are you sure you want to leave "${project.title}"?`
		);
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

		const localJoined = getLocalJoinedProjects().filter((p) => p.id !== project.id);
		saveLocalJoinedProjects(localJoined);

		setProjects((prev) => prev.filter((p) => p.id !== project.id));
		setMessage(`You have left "${project.title}".`);
	};

	const create = async (event: React.FormEvent) => {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setMessage("");

		// Generate clean uniform TINY-XXXX code
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		const joinCode = `TINY-${randomNum}`;
		const userId = session?.user?.id || "local-user";
		const newProject: Project = {
			id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
			title: title.trim(),
			description: description.trim(),
			type: profile?.role === "teacher" ? "class" : "personal",
			join_code: joinCode,
			owner_id: userId,
			created_at: new Date().toISOString(),
			materials: [],
		};

		try {
			const { data, error } = await requireSupabase()
				.from("projects")
				.insert({
					owner_id: userId,
					title: title.trim(),
					description: description.trim(),
					type: profile?.role === "teacher" ? "class" : "personal",
					join_code: joinCode,
					materials: [],
				})
				.select("id,title,description,type,join_code,owner_id,created_at,materials")
				.maybeSingle();

			if (!error && data) {
				newProject.id = data.id;
			}
		} catch (e) {
			console.warn("Supabase insert failed, saving locally:", e);
		}

		// Mirror to localStorage
		const localOwned = getLocalProjects();
		saveLocalProjects([newProject, ...localOwned.filter((p) => p.id !== newProject.id)]);

		setSaving(false);
		setTitle("");
		setDescription("");
		setMessage(`Project created! Share join code: ${joinCode}`);
		void load();
	};

	const join = async (event: React.FormEvent) => {
		event.preventDefault();
		const rawCode = code.trim();
		if (saving || !rawCode) return;
		setSaving(true);
		setMessage("");

		// Normalize: uppercase and remove spaces
		const cleanCode = rawCode.toUpperCase().replace(/\s+/g, "");
		const strippedCode = cleanCode.replace(/-/g, "");

		try {
			let foundProject: Project | null = null;

			// 1. Try secure RPC join_project_by_code in Supabase
			try {
				const { data: rpcData, error: rpcError } = await requireSupabase().rpc("join_project_by_code", {
					code_input: cleanCode,
				});

				if (!rpcError && rpcData?.success && rpcData?.project) {
					foundProject = rpcData.project as Project;
				}
			} catch (rpcErr) {
				console.warn("RPC join failed, falling back to direct query:", rpcErr);
			}

			// 2. Direct table lookup with .maybeSingle() in Supabase
			if (!foundProject) {
				try {
					const { data: projectData } = await requireSupabase()
						.from("projects")
						.select("id, title, description, type, join_code, owner_id, created_at, materials")
						.ilike("join_code", cleanCode)
						.maybeSingle();

					if (projectData) {
						foundProject = projectData as Project;
					}
				} catch (e) {
					console.warn("Supabase direct lookup error:", e);
				}
			}

			// If not found and code has no hyphen, match stripped candidates from Supabase
			if (!foundProject) {
				try {
					const { data: allCandidates } = await requireSupabase()
						.from("projects")
						.select("id, title, description, type, join_code, owner_id, created_at, materials");

					if (allCandidates) {
						const match = allCandidates.find(
							(p) => (p.join_code || "").replace(/-/g, "").toUpperCase() === strippedCode
						);
						if (match) foundProject = match as Project;
					}
				} catch (e) {
					console.warn("Candidate search failed:", e);
				}
			}

			// 3. Fallback: check localStorage ONLY if already created locally on this browser
			if (!foundProject) {
				const localOwned = getLocalProjects();
				const localJoined = getLocalJoinedProjects();
				const allLocal = [...localOwned, ...localJoined];
				const match = allLocal.find(
					(p) => (p.join_code || "").replace(/-/g, "").toUpperCase() === strippedCode
				);
				if (match) {
					foundProject = match;
				}
			}

			// If still not found, do NOT create an empty dummy classroom!
			if (!foundProject) {
				setSaving(false);
				setMessage(
					`Join code "${rawCode}" was not found. Please double-check the code with your teacher or project owner.`
				);
				return;
			}

			// Record membership in Supabase
			if (session?.user?.id) {
				try {
					await requireSupabase()
						.from("project_members")
						.upsert(
							{ project_id: foundProject.id, user_id: session.user.id, role: "student" },
							{ onConflict: "project_id,user_id" }
						);
				} catch (e) {
					console.warn("Could not upsert project_members in Supabase, continuing locally:", e);
				}
			}

			// Save to local joined projects so it persists in the user's workspace
			const joinedList = getLocalJoinedProjects();
			saveLocalJoinedProjects([foundProject, ...joinedList.filter((p) => p.id !== foundProject!.id)]);

			setSaving(false);
			setCode("");
			setMessage(`Successfully joined "${foundProject.title}"!`);
			void load();
		} catch (err: any) {
			setSaving(false);
			setMessage(err?.message || "An unexpected error occurred. Please try again.");
		}
	};

	return (
		<section className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.08),transparent_35%),radial-gradient(circle_at_top_left,rgba(139,92,246,.1),transparent_32%)] p-3.5 sm:p-5 lg:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-violet-300">
						<FolderKanban size={14} /> Shared focus
					</p>
					<h1 className="mt-2 sm:mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
						Projects & Classes
					</h1>
					<p className="mt-1 sm:mt-2 max-w-xl text-xs sm:text-sm text-zinc-400">
						A calmer home for your classes, protected study notes, and shared goals.
					</p>
				</div>
				<div className="rounded-full border border-white/[.08] bg-white/[.04] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-zinc-300">
					<Users size={15} className="mr-2 inline text-cyan-300" />
					{projects.length} {projects.length === 1 ? "project" : "projects"}
				</div>
			</div>

			{message && (
				<p className="mt-4 sm:mt-5 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-3 text-sm text-violet-100 flex items-center justify-between">
					<span>{message}</span>
					<button
						type="button"
						onClick={() => setMessage("")}
						className="text-xs text-violet-300 hover:text-white ml-2 underline"
					>
						Dismiss
					</button>
				</p>
			)}

			<div className="mt-6 sm:mt-8 grid gap-4 sm:gap-5 lg:grid-cols-2">
				<form
					onSubmit={create}
					className="rounded-2xl border border-white/[.08] bg-white/[.04] p-4 sm:p-6 shadow-2xl shadow-violet-950/10"
				>
					<p className="text-xs uppercase tracking-[.16em] text-zinc-500">Start fresh</p>
					<h2 className="mt-2 text-lg font-medium text-white">Create a project or class</h2>
					<input
						className="field mt-4 sm:mt-5"
						required
						placeholder="e.g. Mathematics 101, Tiny Wins Team"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
					<textarea
						className="field mt-3 min-h-24"
						placeholder="Description or course syllabus summary..."
						value={description}
						onChange={(event) => setDescription(event.target.value)}
					/>
					<button
						disabled={saving}
						className="button mt-4 inline-flex items-center gap-2 bg-violet-400 text-zinc-950 font-medium disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Plus size={16} />
						{saving ? "Saving..." : "Create project"}
					</button>
				</form>

				<form
					onSubmit={join}
					className="rounded-2xl border border-white/[.08] bg-white/[.04] p-4 sm:p-6 shadow-2xl shadow-violet-950/10"
				>
					<p className="text-xs uppercase tracking-[.16em] text-zinc-500">Have an invitation?</p>
					<h2 className="mt-2 text-lg font-medium text-white">Join with code</h2>
					<input
						className="field mt-4 sm:mt-5 font-mono uppercase tracking-wider"
						required
						placeholder="e.g. TINY-8851"
						value={code}
						onChange={(event) => setCode(event.target.value)}
					/>
					<p className="mt-2 text-xs text-zinc-500">
						Enter the code shared by your teacher or team lead (case-insensitive).
					</p>
					<button
						disabled={saving}
						className="button mt-4 font-medium disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? "Joining..." : "Join with code"}
					</button>
				</form>
			</div>

			{loading ? (
				<p className="mt-10 text-sm text-zinc-500">Loading your projects...</p>
			) : projects.length === 0 ? (
				<div className="mt-8 rounded-2xl border border-dashed border-white/[.12] px-6 py-14 text-center">
					<FolderKanban className="mx-auto text-zinc-600" size={30} />
					<h2 className="mt-4 text-lg text-white">Your next tiny win starts here</h2>
					<p className="mt-2 text-sm text-zinc-500">Create a project or join one with a code.</p>
				</div>
			) : (
				<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{projects.map((project) => (
						<div
							key={project.id}
							className="group relative flex flex-col justify-between rounded-2xl border border-white/[.08] bg-white/[.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[.06] hover:shadow-xl hover:shadow-cyan-950/20"
						>
							<div>
								<div className="flex items-start justify-between gap-4">
									<span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.14em] text-cyan-200">
										{project.type}
									</span>
									<div className="flex items-center gap-1.5">
										{project.owner_id === session?.user?.id ? (
											<button
												type="button"
												onClick={(e) => handleDeleteProject(e, project)}
												className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
												title="Delete project"
												aria-label="Delete project"
											>
												<Trash2 size={16} />
											</button>
										) : (
											<button
												type="button"
												onClick={(e) => handleLeaveClass(e, project)}
												className="rounded-lg p-1.5 text-zinc-500 hover:bg-amber-500/15 hover:text-amber-400 transition"
												title="Leave class"
												aria-label="Leave class"
											>
												<LogOut size={16} />
											</button>
										)}
										<Link
											to={`/projects/${project.id}`}
											className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[.08] hover:text-cyan-200 transition"
											aria-label={`Open ${project.title}`}
										>
											<ArrowUpRight size={18} />
										</Link>
									</div>
								</div>

								<h2 className="mt-4 text-xl font-medium text-white">{project.title}</h2>
								<p className="mt-2 min-h-10 text-sm leading-6 text-zinc-400">
									{project.description || "No description yet."}
								</p>
							</div>

							<div className="mt-5 border-t border-white/[.06] pt-4">
								{project.join_code && (
									<div className="flex items-center justify-between gap-2 rounded-xl bg-white/[.03] px-3 py-2 border border-white/[.05]">
										<div className="min-w-0">
											<p className="text-[10px] uppercase tracking-wider text-zinc-500">Join Code</p>
											<p className="font-mono text-xs font-semibold text-violet-200 tracking-wider">
												{project.join_code}
											</p>
										</div>
										<button
											type="button"
											onClick={(e) => copyCodeToClipboard(e, project)}
											className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-200 hover:bg-violet-400/20 transition"
											title="Copy join code to share"
										>
											{copiedId === project.id ? (
												<>
													<Check size={12} className="text-emerald-400" />
													<span className="text-emerald-400">Copied!</span>
												</>
											) : (
												<>
													<Copy size={12} />
													<span>Copy</span>
												</>
											)}
										</button>
									</div>
								)}

								<Link
									to={`/projects/${project.id}`}
									className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition group-hover:text-cyan-300"
								>
									Open Workspace <ArrowUpRight size={14} />
								</Link>
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

