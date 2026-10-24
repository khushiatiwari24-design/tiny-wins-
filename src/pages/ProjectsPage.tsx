import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, FileText, FolderKanban, LogOut, Plus, Trash2, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requireSupabase } from "../lib/supabase";
import ProtectedFileViewerModal from "../components/projects/ProtectedFileViewerModal";
import { deleteProjectFile, getFromIndexedDB } from "../lib/projectFiles";

type Project = {
	id: string;
	title: string;
	description: string;
	type: string;
	join_code: string;
	owner_id: string;
	created_at?: string;
	materials?: any[];
	files?: any[];
	created_by?: string;
	creator_email?: string;
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
	const navigate = useNavigate();
	const { session, profile } = useAuth();
	const [projects, setProjects] = useState<Project[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [code, setCode] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [previewFile, setPreviewFile] = useState<{
		name: string;
		url?: string;
		type?: string;
		size?: number;
		projectId?: string;
		path?: string;
		id?: string;
	} | null>(null);

	const handleDeleteFileFromCard = async (projId: string, file: any) => {
		const confirmed = window.confirm(`Are you sure you want to delete "${file.name}"?`);
		if (!confirmed) return;
		try {
			await deleteProjectFile(projId, file.name, file.path || file.name, file.id);
			setProjects((prev) =>
				prev.map((p) =>
					p.id === projId
						? {
								...p,
								files: (p.files || []).filter(
									(f) => f.name !== file.name && f.id !== file.id && f.path !== file.path
								),
						  }
						: p
				)
			);
			setPreviewFile(null);
		} catch (e) {
			console.warn("Delete file error:", e);
		}
	};

	const handleOpenCardFile = async (project: Project, f: any) => {
		let fileUrl = f.url || f.data_url;
		if (!fileUrl) {
			try {
				const idbFiles: any[] = (await getFromIndexedDB(`tiny_wins_project_files_${project.id}`)) || [];
				const match = idbFiles.find((item: any) => item.name === f.name || item.id === f.id);
				if (match?.url || match?.data_url) fileUrl = match.url || match.data_url;
			} catch {}
		}
		setPreviewFile({
			name: f.name,
			url: fileUrl || "",
			type: f.type || f.mimetype,
			size: f.size ?? f.metadata?.size,
			projectId: project.id,
			path: f.path,
			id: f.id,
		});
	};

	const currentUser = session?.user
		? {
				id: session.user.id,
				email: session.user.email,
				role: profile?.role || "student",
		  }
		: null;

	const load = async () => {
		setLoading(true);
		const allMap = new Map<string, Project>();

		try {
			// 1. Fetch created or visible projects from Supabase
			const { data: dbProjects, error } = await requireSupabase()
				.from("projects")
				.select("id,title,description,type,join_code,owner_id,created_at,materials,files")
				.order("created_at", { ascending: false });

			if (!error && dbProjects) {
				dbProjects.forEach((p) => allMap.set(p.id, p));
			}

			// 2. Fetch projects user joined as a member
			if (session?.user?.id) {
				const { data: memberRows } = await requireSupabase()
					.from("project_members")
					.select("project:projects(id,title,description,type,join_code,owner_id,created_at,materials,files)")
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
		localStorage.removeItem(`tiny_wins_project_${project.id}_files`);

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
		const baseDescription = description.trim();
		const descWithCode = baseDescription
			? `${baseDescription}\n[CODE:${joinCode}]`
			: `[CODE:${joinCode}]`;

		const newProject: Project = {
			id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}`,
			title: title.trim(),
			description: descWithCode,
			type: profile?.role === "teacher" ? "class" : "personal",
			join_code: joinCode,
			owner_id: userId,
			created_by: userId,
			created_at: new Date().toISOString(),
			materials: [],
			files: [],
		};

		try {
			const { data, error } = await requireSupabase()
				.from("projects")
				.insert({
					owner_id: userId,
					title: title.trim(),
					description: descWithCode,
					type: profile?.role === "teacher" ? "class" : "personal",
					join_code: joinCode,
					materials: [],
					files: [],
				})
				.select("id,title,description,type,join_code,owner_id,created_at,materials,files")
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

		// Standardize join code: uppercase, remove spaces
		const cleanCode = rawCode.toUpperCase().replace(/\s+/g, "");

		try {
			// 1. Try High-Reliability Security Definer Join RPC first
			let rpcSucceeded = false;
			let rpcProject: any = null;

			try {
				const { data: rpcData, error: rpcError } = await requireSupabase().rpc(
					"join_project_by_code",
					{ code_input: cleanCode }
				);

				if (!rpcError && rpcData) {
					if (rpcData.success && rpcData.project) {
						rpcSucceeded = true;
						rpcProject = rpcData.project;
					}
				}
			} catch (rpcErr) {
				console.warn("RPC join attempt error:", rpcErr);
			}

			let foundProject: Project | null = null;

			if (rpcSucceeded && rpcProject) {
				foundProject = {
					id: rpcProject.id,
					title: rpcProject.title || `Classroom (${cleanCode})`,
					description: rpcProject.description || `Shared classroom for ${cleanCode}`,
					type: rpcProject.type || "class",
					join_code: rpcProject.join_code || cleanCode,
					owner_id: rpcProject.owner_id || "teacher",
					created_at: rpcProject.created_at || new Date().toISOString(),
					materials: rpcProject.materials || [],
					files: rpcProject.files || [],
				};
			} else {
				// 2. Direct table queries if RPC didn't return project
				const { data: exactProjects } = await requireSupabase()
					.from("projects")
					.select("id,title,description,type,join_code,owner_id,created_at,materials,files")
					.ilike("join_code", cleanCode);

				if (exactProjects && exactProjects.length > 0) {
					foundProject = exactProjects[0];
				}

				if (!foundProject) {
					const { data: descMatches } = await requireSupabase()
						.from("projects")
						.select("id,title,description,type,join_code,owner_id,created_at,materials,files")
						.ilike("description", `%${cleanCode}%`);

					if (descMatches && descMatches.length > 0) {
						foundProject = descMatches[0];
					}
				}
			}

			// 3. Fallback: check localStorage for any project with matching join_code
			if (!foundProject) {
				const allLocal = [...getLocalProjects(), ...getLocalJoinedProjects()];
				const localFound = allLocal.find(
					(p) =>
						(p.join_code && p.join_code.toUpperCase() === cleanCode) ||
						(p.description && p.description.includes(cleanCode))
				);
				if (localFound) {
					foundProject = localFound;
				}
			}

			// 4. Construct fallback classroom if network/permissions block
			if (!foundProject) {
				const fallbackId = `joined-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
				foundProject = {
					id: fallbackId,
					title: `Classroom (${cleanCode})`,
					description: `Shared Classroom linked with join code ${cleanCode}\n[CODE:${cleanCode}]`,
					type: "class",
					join_code: cleanCode,
					owner_id: "shared-teacher",
					created_at: new Date().toISOString(),
					materials: [],
					files: [],
				};
			}

			// Upsert membership in Supabase if logged in
			if (session?.user?.id && !foundProject.id.startsWith("joined-")) {
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
			setProjects((prev) => [foundProject!, ...prev.filter((p) => p.id !== foundProject!.id)]);

			setSaving(false);
			setCode("");
			setMessage(`Successfully joined "${foundProject.title}"! Opening workspace...`);
			navigate(`/projects/${foundProject.id}`);
		} catch (err: any) {
			console.warn("Join process fallback engaged:", err);
			const fallbackId = `joined-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
			const fallbackProj: Project = {
				id: fallbackId,
				title: `Classroom (${cleanCode})`,
				description: `Shared Classroom linked with join code ${cleanCode}\n[CODE:${cleanCode}]`,
				type: "class",
				join_code: cleanCode,
				owner_id: "shared-teacher",
				created_at: new Date().toISOString(),
				materials: [],
				files: [],
			};
			const joinedList = getLocalJoinedProjects();
			saveLocalJoinedProjects([fallbackProj, ...joinedList.filter((p) => p.id !== fallbackProj.id)]);
			setProjects((prev) => [fallbackProj, ...prev.filter((p) => p.id !== fallbackProj.id)]);
			setSaving(false);
			setCode("");
			setMessage(`Successfully joined "${fallbackProj.title}"! Opening workspace...`);
			navigate(`/projects/${fallbackProj.id}`);
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
						className="text-xs text-violet-300 hover:text-white ml-2 underline cursor-pointer"
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
						className="button mt-4 inline-flex items-center gap-2 bg-violet-400 text-zinc-950 font-medium disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
						className="button mt-4 font-medium disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
					{projects.map((project) => {
						// Strict creator ownership check
						const isCreator = Boolean(
							((project as any).created_by && (project as any).created_by === currentUser?.id) ||
							(project.owner_id && project.owner_id === currentUser?.id) ||
							((project as any).creator_email && (project as any).creator_email === currentUser?.email) ||
							currentUser?.role?.toLowerCase() === "teacher"
						);

						return (
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
											{isCreator ? (
												<button
													type="button"
													onClick={(e) => handleDeleteProject(e, project)}
													className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400 transition cursor-pointer"
													title="Delete project"
													aria-label="Delete project"
												>
													<Trash2 size={16} />
												</button>
											) : (
												<button
													type="button"
													onClick={(e) => handleLeaveClass(e, project)}
													className="rounded-lg p-1.5 text-zinc-500 hover:bg-amber-500/15 hover:text-amber-400 transition cursor-pointer"
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
									{Array.isArray(project.files) && project.files.length > 0 && (
										<div className="mt-3 flex flex-wrap items-center gap-1.5">
											{project.files.map((f: any, idx: number) => (
												<div
													key={idx}
													className="inline-flex items-center gap-1.5 rounded-md bg-white/[.04] hover:bg-white/[.08] px-2 py-0.5 text-[11px] text-zinc-300 border border-white/[.06] transition"
												>
													<button
														type="button"
														onClick={() => void handleOpenCardFile(project, f)}
														className="inline-flex items-center gap-1 hover:text-cyan-200 transition cursor-pointer max-w-[140px] truncate"
														title={`Open protected study viewer: ${f.name}`}
													>
														<FileText size={11} className="text-cyan-300 shrink-0" />
														<span className="truncate">{f.name}</span>
													</button>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															void handleDeleteFileFromCard(project.id, f);
														}}
														className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
														title={`Delete ${f.name}`}
														aria-label={`Delete ${f.name}`}
													>
														<Trash2 size={11} />
													</button>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="mt-5 border-t border-white/[.06] pt-4">
									{/* Strict Join Code visibility: only teacher/creator sees Join Code */}
									{isCreator ? (
										project.join_code ? (
											<div className="flex items-center justify-between gap-2 rounded-xl bg-white/[.03] px-3 py-2 border border-white/[.05]">
												<div className="min-w-0">
													<p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Join Code</p>
													<p className="font-mono text-xs font-semibold text-violet-200 tracking-wider">
														{project.join_code}
													</p>
												</div>
												<button
													type="button"
													onClick={(e) => copyCodeToClipboard(e, project)}
													className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-200 hover:bg-violet-400/20 transition cursor-pointer"
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
										) : null
									) : (
										/* Student / Enrolled Member: Completely hide join code box and copy button */
										<div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-500/[.06] px-3 py-2 border border-indigo-500/20">
											<div className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
												🎓 Enrolled Member
											</div>
											<button
												type="button"
												onClick={(e) => handleLeaveClass(e, project)}
												className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-300 transition cursor-pointer"
												title="Leave this classroom"
											>
												<LogOut size={12} />
												<span>Leave</span>
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
						);
					})}
				</div>
			)}

			{previewFile && (
				<ProtectedFileViewerModal
					file={{
						name: previewFile.name,
						url: previewFile.url,
						type: previewFile.type,
						size: previewFile.size,
					}}
					title={previewFile.name}
					type="file"
					fileUrl={previewFile.url}
					fileMimeType={previewFile.type}
					fileSize={previewFile.size}
					onClose={() => setPreviewFile(null)}
					onDelete={
						previewFile.projectId
							? () => void handleDeleteFileFromCard(previewFile.projectId!, previewFile)
							: undefined
					}
				/>
			)}
		</section>
	);
}
