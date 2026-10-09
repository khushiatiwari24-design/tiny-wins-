import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { requireSupabase } from "../lib/supabase";
import TaskList from "../components/tasks/TaskList";

type Category = { id: string; name: string; color: string };

export default function CategoriesPage() {
  const { session } = useAuth();
  const { tasks, categories, projects, save, remove: removeTask, toggle } = useTasks(session?.user.id);
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [editing, setEditing] = useState<Category | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => { const { data, error } = await requireSupabase().from("categories").select("id,name,color").eq("user_id", session?.user.id).order("name"); if (error) setMessage(`Unable to load categories: ${error.message}`); else setItems(data ?? []); };
  useEffect(() => { void load(); }, [session?.user.id]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const result = editing ? await requireSupabase().from("categories").update({ name: name.trim(), color }).eq("id", editing.id).eq("user_id", session!.user.id) : await requireSupabase().from("categories").insert({ user_id: session!.user.id, name: name.trim(), color }); if (result.error) setMessage(result.error.code === "23505" ? "A category with that name already exists." : `Unable to save category: ${result.error.message}`); else { setName(""); setEditing(null); setMessage(""); void load(); } };
  const remove = async (category: Category) => { const { error } = await requireSupabase().from("categories").delete().eq("id", category.id).eq("user_id", session!.user.id); if (error) setMessage(`Unable to delete category: ${error.message}`); else { if (selected === category.name) setSelected(null); void load(); } };
  const visibleTasks = selected ? tasks.filter((task) => task.category === selected) : [];
  return <section className="p-5 lg:p-8"><h1 className="text-3xl font-semibold text-white">Categories</h1><p className="mt-2 text-zinc-500">Organize tasks using your real workspace categories.</p><form onSubmit={submit} className="mt-7 flex max-w-xl gap-3"><input className="field" required placeholder="Category name" value={name} onChange={(event) => setName(event.target.value)} /><input aria-label="Category color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-12 rounded border-0 bg-transparent" /><button className="button bg-violet-400 text-zinc-950">{editing ? "Save" : "Add"}</button>{editing && <button type="button" className="button" onClick={() => { setEditing(null); setName(""); }}>Cancel</button>}</form>{message && <p className="mt-4 text-sm text-red-300">{message}</p>}<div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-2">{items.map((category) => { const count = tasks.filter((task) => task.category === category.name).length; return <div key={category.id} className={`rounded-2xl border p-4 ${selected === category.name ? "border-violet-300/50 bg-violet-400/10" : "border-white/[.07] bg-white/[.025]"}`}><button className="flex w-full items-center gap-3 text-left text-zinc-200" onClick={() => setSelected(selected === category.name ? null : category.name)}><i className="h-3 w-3 rounded-full" style={{ background: category.color }} />{category.name}<span className="ml-auto text-xs text-zinc-500">{count} tasks</span></button><div className="mt-4 flex gap-4 text-xs"><button className="text-zinc-400 hover:text-white" onClick={() => { setEditing(category); setName(category.name); setColor(category.color); }}>Edit</button><button className="text-red-300 hover:text-red-200" onClick={() => void remove(category)}>Delete</button></div></div>; })}</div>{selected && <div className="mt-7 max-w-4xl"><TaskList tasks={visibleTasks} categories={categories} projects={projects} onSave={save} onDelete={removeTask} onToggle={toggle} title={`${selected} tasks`} /></div>}</section>;
}
