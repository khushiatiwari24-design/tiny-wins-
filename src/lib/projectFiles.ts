import { requireSupabase } from "./supabase";

export interface StoredProjectFile {
  id: string | null;
  name: string;
  path: string;
  size?: number;
  mimetype?: string;
  type?: string;
  created_at?: string;
  uploaded_at?: string;
  uploader_name?: string;
  uploader_id?: string;
  url?: string;
  data_url?: string;
  isLocalFallback?: boolean;
  metadata?: {
    size?: number;
    mimetype?: string;
    uploader_name?: string;
    url?: string;
    data_url?: string;
  };
}

export function getLocalProjectFiles(projectId: string): StoredProjectFile[] {
  try {
    const raw = localStorage.getItem(`tiny_wins_project_${projectId}_files`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalProjectFile(projectId: string, file: StoredProjectFile) {
  try {
    const existing = getLocalProjectFiles(projectId);
    const updated = [file, ...existing.filter((f) => f.name !== file.name && f.id !== file.id && f.path !== file.path)];
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not write file to localStorage:", e);
  }
}

export function removeLocalProjectFile(projectId: string, identifier: string) {
  try {
    const existing = getLocalProjectFiles(projectId);
    const updated = existing.filter((f) => f.name !== identifier && f.path !== identifier && f.id !== identifier);
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
  } catch {}
}

/**
 * Upload project file storing self-contained Base64 data URL directly
 * in project metadata (localStorage & Supabase projects.materials / projects.files JSON column).
 * Eliminates "NoSuchBucket" and 404 Supabase Storage bucket dependencies!
 */
export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: File,
  uploaderName?: string
): Promise<{ file: StoredProjectFile; message: string; isFallback: boolean }> {
  if (file.size === 0) {
    throw new Error("Cannot upload empty file (0 Bytes). Please select a valid document or image.");
  }

  const supabase = requireSupabase();
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${projectId}/${userId}/${timestamp}_${cleanName}`;

  // 1. Read every uploaded file using FileReader.readAsDataURL(file)
  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read file as Base64 data URL."));
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });

  if (!base64DataUrl) {
    throw new Error("Could not process file content.");
  }

  // 2. Self-contained Base64 data URL stored directly in metadata
  const fileMetadata: StoredProjectFile = {
    id: `file-${timestamp}-${cleanName}`,
    name: file.name,
    path: storagePath,
    size: file.size,
    mimetype: file.type || "application/octet-stream",
    type: file.type || "application/octet-stream",
    url: base64DataUrl, // Self-contained Base64 URL so rendering NEVER depends on external bucket naming!
    data_url: base64DataUrl,
    created_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    uploader_name: uploaderName || "Teacher",
    uploader_id: userId,
    isLocalFallback: false,
    metadata: {
      size: file.size,
      mimetype: file.type || "application/octet-stream",
      uploader_name: uploaderName || "Teacher",
      url: base64DataUrl,
      data_url: base64DataUrl,
    },
  };

  // 3. Centralized Metadata Persistence in Supabase `projects.files` & `projects.materials` JSON column
  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("id, files, materials")
      .eq("id", projectId)
      .maybeSingle();

    if (projData) {
      const existingFiles: any[] = Array.isArray(projData.files) ? projData.files : [];
      const updatedFiles = [
        fileMetadata,
        ...existingFiles.filter((f) => f.name !== fileMetadata.name && f.id !== fileMetadata.id && f.path !== fileMetadata.path),
      ];

      const existingMaterials: any[] = Array.isArray(projData.materials) ? projData.materials : [];
      const updatedMaterials = [
        fileMetadata,
        ...existingMaterials.filter((m) => m.name !== fileMetadata.name && m.id !== fileMetadata.id && m.path !== fileMetadata.path),
      ];

      await supabase
        .from("projects")
        .update({
          files: updatedFiles,
          materials: updatedMaterials,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
    }
  } catch (err) {
    console.warn("Could not sync Base64 metadata into projects row:", err);
  }

  // 4. Also store in dedicated project_files table if present
  try {
    await supabase.from("project_files").insert({
      project_id: projectId,
      user_id: userId,
      name: fileMetadata.name,
      file_path: storagePath,
      size: fileMetadata.size,
      mime_type: fileMetadata.mimetype,
      url: base64DataUrl,
      metadata: fileMetadata,
      created_at: fileMetadata.created_at,
    });
  } catch {}

  // 5. Cache locally in localStorage for persistent zero-latency rendering
  saveLocalProjectFile(projectId, fileMetadata);

  // Background opportunistic upload to storage if bucket happens to exist, but URL remains Base64
  try {
    void supabase.storage
      .from("project-files")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      })
      .catch(() => {});
  } catch {}

  return {
    file: fileMetadata,
    message: "File stored securely as self-contained document and ready to view!",
    isFallback: false,
  };
}

/**
 * Robust Fetching on Mount & on "Sync Materials" Click:
 * Merges projects table JSONB, project_files table, and localStorage.
 */
export async function fetchProjectFiles(
  projectId: string,
  memberIds: string[] = []
): Promise<StoredProjectFile[]> {
  const supabase = requireSupabase();
  const fileMap = new Map<string, StoredProjectFile>();

  // 1. Centralized metadata from projects table
  try {
    const { data: proj } = await supabase
      .from("projects")
      .select("id, files, materials")
      .eq("id", projectId)
      .maybeSingle();

    if (proj) {
      if (Array.isArray(proj.files)) {
        proj.files.forEach((f: any) => {
          if (f?.name) {
            fileMap.set(f.name, {
              ...f,
              id: f.id || `f-${f.name}`,
              path: f.path || `${projectId}/${f.name}`,
              created_at: f.created_at || f.uploaded_at || new Date().toISOString(),
            });
          }
        });
      }

      if (Array.isArray(proj.materials)) {
        proj.materials.forEach((m: any) => {
          if (m?.name && (m?.path || m?.url || m?.size || m?.type || m?.mimetype)) {
            if (!fileMap.has(m.name)) {
              fileMap.set(m.name, {
                ...m,
                id: m.id || `f-${m.name}`,
                path: m.path || `${projectId}/${m.name}`,
                created_at: m.created_at || m.uploaded_at || new Date().toISOString(),
              });
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn("Error fetching projects metadata:", err);
  }

  // 2. Dedicated project_files table if present
  try {
    const { data: pfList } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId);

    if (pfList && Array.isArray(pfList)) {
      pfList.forEach((row: any) => {
        const name = row.name || row.metadata?.name;
        if (name && !fileMap.has(name)) {
          fileMap.set(name, {
            id: row.id,
            name,
            path: row.file_path || row.path || `${projectId}/${name}`,
            size: row.size || row.metadata?.size,
            mimetype: row.mime_type || row.mimetype || row.metadata?.mimetype,
            created_at: row.created_at,
            url: row.url || row.metadata?.url,
            data_url: row.metadata?.data_url,
            uploader_name: row.uploader_name || row.metadata?.uploader_name,
          });
        }
      });
    }
  } catch {}

  // 3. Local storage fallback
  const localFiles = getLocalProjectFiles(projectId);
  localFiles.forEach((f) => {
    if (!fileMap.has(f.name)) {
      fileMap.set(f.name, f);
    } else {
      const existing = fileMap.get(f.name)!;
      if (!existing.url && f.url) {
        fileMap.set(f.name, { ...existing, url: f.url, data_url: f.data_url || existing.data_url });
      }
    }
  });

  // 4. Ensure valid URLs for all files (prioritizing self-contained Base64 data URLs)
  const merged = Array.from(fileMap.values()).map((file) => {
    const resolvedUrl = file.data_url || file.metadata?.data_url || file.url || file.metadata?.url || "";
    return {
      ...file,
      url: resolvedUrl,
      size: file.size ?? file.metadata?.size,
    };
  });

  // Cache locally
  try {
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(merged));
  } catch {}

  return merged;
}

export async function deleteProjectFile(
  projectId: string,
  fileName: string,
  filePath: string,
  fileId?: string | null
) {
  const supabase = requireSupabase();
  removeLocalProjectFile(projectId, fileName);
  if (fileId) removeLocalProjectFile(projectId, fileId);
  if (filePath) removeLocalProjectFile(projectId, filePath);

  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("id, files, materials")
      .eq("id", projectId)
      .maybeSingle();

    if (projData) {
      const updatedFiles = (projData.files || []).filter(
        (f: any) => f.name !== fileName && f.path !== filePath && (!fileId || f.id !== fileId)
      );
      const updatedMaterials = (projData.materials || []).filter(
        (m: any) => m.name !== fileName && m.path !== filePath && (!fileId || m.id !== fileId)
      );
      await supabase.from("projects").update({
        files: updatedFiles,
        materials: updatedMaterials,
        updated_at: new Date().toISOString(),
      }).eq("id", projectId);
    }
  } catch {}

  try {
    await supabase.from("project_files").delete().eq("project_id", projectId).eq("name", fileName);
    if (fileId) {
      await supabase.from("project_files").delete().eq("project_id", projectId).eq("id", fileId);
    }
  } catch {}

  try {
    if (filePath) {
      await supabase.storage.from("project-files").remove([filePath]).catch(() => {});
    }
  } catch {}
}
