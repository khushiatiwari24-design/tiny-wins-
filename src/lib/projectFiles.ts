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
  isLocalFallback?: boolean;
  metadata?: {
    size?: number;
    mimetype?: string;
    uploader_name?: string;
  };
}

export const UPLOAD_TIMEOUT_MS = 5000;

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
    const updated = [file, ...existing.filter((f) => f.name !== file.name && f.id !== file.id)];
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not write file to localStorage:", e);
  }
}

export function removeLocalProjectFile(projectId: string, fileName: string) {
  try {
    const existing = getLocalProjectFiles(projectId);
    const updated = existing.filter((f) => f.name !== fileName && f.path !== fileName);
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
  } catch {}
}

/**
 * Upload project file with strict 5-second timeout,
 * centralized Supabase metadata persistence, and instant offline/local fallback.
 */
export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: File,
  uploaderName?: string
): Promise<{ file: StoredProjectFile; message: string; isFallback: boolean }> {
  const supabase = requireSupabase();
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${projectId}/${userId}/${timestamp}_${cleanName}`;

  let uploadSuccess = false;

  // Convert to Data URL (for files under 8MB) for instantaneous offline/fallback preview
  const fileDataUrlPromise = new Promise<string>((resolve) => {
    if (file.size > 8 * 1024 * 1024) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });

  // Strict 5-second timeout Promise
  const timeoutPromise = new Promise<{ data: null; error: { message: string; isTimeout: boolean } }>((resolve) => {
    window.setTimeout(() => {
      resolve({
        data: null,
        error: { message: "Upload timed out (5s limit reached).", isTimeout: true },
      });
    }, UPLOAD_TIMEOUT_MS);
  });

  // Attempt Supabase storage upload
  const uploadPromise = supabase.storage
    .from("project-files")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  let uploadError: any = null;

  try {
    const raceResult: any = await Promise.race([uploadPromise, timeoutPromise]);
    if (raceResult?.data && !raceResult?.error) {
      uploadSuccess = true;
    } else {
      uploadError = raceResult?.error;
    }
  } catch (err: any) {
    uploadError = err;
  }

  const dataUrl = await fileDataUrlPromise;

  // Obtain public or signed URL if possible
  let remoteUrl = "";
  if (uploadSuccess) {
    try {
      const { data: pubData } = supabase.storage.from("project-files").getPublicUrl(storagePath);
      if (pubData?.publicUrl) remoteUrl = pubData.publicUrl;
    } catch {}
  }

  const fileMetadata: StoredProjectFile = {
    id: `file-${timestamp}-${cleanName}`,
    name: file.name,
    path: storagePath,
    size: file.size,
    mimetype: file.type || "application/octet-stream",
    type: file.type || "application/octet-stream",
    url: remoteUrl || dataUrl || (typeof window !== "undefined" ? URL.createObjectURL(file) : ""),
    created_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    uploader_name: uploaderName || "Teacher",
    uploader_id: userId,
    isLocalFallback: !uploadSuccess,
    metadata: {
      size: file.size,
      mimetype: file.type || "application/octet-stream",
      uploader_name: uploaderName || "Teacher",
    },
  };

  // 1. Centralized Metadata Persistence in Supabase `projects` row
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
        ...existingFiles.filter((f) => f.name !== fileMetadata.name && f.id !== fileMetadata.id),
      ];

      const existingMaterials: any[] = Array.isArray(projData.materials) ? projData.materials : [];
      const updatedMaterials = [
        fileMetadata,
        ...existingMaterials.filter((m) => m.name !== fileMetadata.name && m.id !== fileMetadata.id),
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
    console.warn("Could not sync metadata into projects row:", err);
  }

  // 2. Also attempt insert into dedicated project_files table if present
  try {
    await supabase.from("project_files").insert({
      project_id: projectId,
      user_id: userId,
      name: fileMetadata.name,
      file_path: storagePath,
      size: fileMetadata.size,
      mime_type: fileMetadata.mimetype,
      url: fileMetadata.url,
      metadata: fileMetadata,
      created_at: fileMetadata.created_at,
    });
  } catch {}

  // 3. Cache locally for instant availability
  saveLocalProjectFile(projectId, fileMetadata);

  if (uploadSuccess) {
    return {
      file: fileMetadata,
      message: "File uploaded successfully to cloud & synced with class.",
      isFallback: false,
    };
  } else {
    const errorMsg = uploadError?.message || "Storage timeout";
    return {
      file: fileMetadata,
      message: `File saved locally (fast fallback activated: ${errorMsg}). Ready to view!`,
      isFallback: true,
    };
  }
}

/**
 * Robust Fetching on Mount & on "Sync Materials" Click:
 * 1. Checks projects row files/materials JSONB in Supabase (primary shared source)
 * 2. Checks project_files table
 * 3. Checks Supabase storage listing
 * 4. Merges and deduplicates with localStorage
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
            uploader_name: row.uploader_name || row.metadata?.uploader_name,
          });
        }
      });
    }
  } catch {}

  // 3. Storage bucket listing (secondary source)
  try {
    const rootPromise = supabase.storage
      .from("project-files")
      .list(projectId, { sortBy: { column: "created_at", order: "desc" } })
      .then(({ data }) => (data ? data.map((f) => ({ ...f, folder: projectId })) : []));

    const memberPromises = [...new Set(memberIds)].map((memId) => {
      const folder = `${projectId}/${memId}`;
      return supabase.storage
        .from("project-files")
        .list(folder, { sortBy: { column: "created_at", order: "desc" } })
        .then(({ data }) => (data ? data.map((f) => ({ ...f, folder })) : []));
    });

    const timeout = new Promise<any[]>((resolve) => window.setTimeout(() => resolve([]), 4000));
    const storageResults = await Promise.race([
      Promise.all([rootPromise, ...memberPromises]).then((res) => res.flat()),
      timeout,
    ]);

    storageResults.forEach((f: any) => {
      if (f && f.name && f.name !== ".emptyFolderPlaceholder") {
        const cleanName = f.name.replace(/^\d+_/, "").replace(/^\d+-/, "");
        if (!fileMap.has(cleanName) && !fileMap.has(f.name)) {
          fileMap.set(cleanName, {
            id: f.id || `${f.folder}/${f.name}`,
            name: cleanName,
            path: `${f.folder}/${f.name}`,
            size: f.metadata?.size,
            mimetype: f.metadata?.mimetype,
            created_at: f.created_at || new Date().toISOString(),
            metadata: f.metadata,
          });
        }
      }
    });
  } catch (err) {
    console.warn("Storage listing error:", err);
  }

  // 4. Local storage fallback
  const localFiles = getLocalProjectFiles(projectId);
  localFiles.forEach((f) => {
    if (!fileMap.has(f.name)) {
      fileMap.set(f.name, f);
    } else {
      const existing = fileMap.get(f.name)!;
      if (!existing.url && f.url) {
        fileMap.set(f.name, { ...existing, url: f.url });
      }
    }
  });

  const merged = Array.from(fileMap.values());

  // Cache locally
  try {
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(merged));
  } catch {}

  return merged;
}

export async function deleteProjectFile(
  projectId: string,
  fileName: string,
  filePath: string
) {
  const supabase = requireSupabase();
  removeLocalProjectFile(projectId, fileName);

  try {
    const { data: projData } = await supabase
      .from("projects")
      .select("id, files, materials")
      .eq("id", projectId)
      .maybeSingle();

    if (projData) {
      const updatedFiles = (projData.files || []).filter((f: any) => f.name !== fileName && f.path !== filePath);
      const updatedMaterials = (projData.materials || []).filter((m: any) => m.name !== fileName && m.path !== filePath);
      await supabase.from("projects").update({
        files: updatedFiles,
        materials: updatedMaterials,
        updated_at: new Date().toISOString(),
      }).eq("id", projectId);
    }
  } catch {}

  try {
    await supabase.from("project_files").delete().eq("project_id", projectId).eq("name", fileName);
  } catch {}

  try {
    await supabase.storage.from("project-files").remove([filePath]);
  } catch {}
}
