import { requireSupabase } from "./supabase";

export interface StoredProjectFile {
  id: string | null;
  name: string;
  path: string;
  size?: number;
  mimetype?: string;
  created_at?: string;
  url?: string;
  isLocalFallback?: boolean;
  metadata?: {
    size?: number;
    mimetype?: string;
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
    const updated = [file, ...existing.filter((f) => f.name !== file.name)];
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

export async function uploadProjectFile(
  projectId: string,
  userId: string,
  file: File
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

  const resultFile: StoredProjectFile = {
    id: uploadSuccess ? `${timestamp}-${cleanName}` : `local-${timestamp}-${cleanName}`,
    name: file.name,
    path: storagePath,
    size: file.size,
    mimetype: file.type || "application/octet-stream",
    created_at: new Date().toISOString(),
    url: dataUrl || (typeof window !== "undefined" ? URL.createObjectURL(file) : undefined),
    isLocalFallback: !uploadSuccess,
    metadata: {
      size: file.size,
      mimetype: file.type || "application/octet-stream",
    },
  };

  // Cache locally for instant availability
  saveLocalProjectFile(projectId, resultFile);

  if (uploadSuccess) {
    return {
      file: resultFile,
      message: "File uploaded successfully to cloud.",
      isFallback: false,
    };
  } else {
    const errorMsg = uploadError?.message || "Storage timeout";
    return {
      file: resultFile,
      message: `File saved locally (fast fallback activated: ${errorMsg}). Ready to view!`,
      isFallback: true,
    };
  }
}

export async function fetchProjectFiles(
  projectId: string,
  memberIds: string[]
): Promise<StoredProjectFile[]> {
  const supabase = requireSupabase();
  const remoteFiles: StoredProjectFile[] = [];

  try {
    const listPromises = [...new Set(memberIds)].map(async (memberId) => {
      const folder = `${projectId}/${memberId}`;
      const { data, error } = await supabase.storage.from("project-files").list(folder, {
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error || !data) return [];
      return data
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => ({
          id: f.id || `${folder}/${f.name}`,
          name: f.name.replace(/^\d+_/, "").replace(/^\d+-/, ""),
          path: `${folder}/${f.name}`,
          size: f.metadata?.size,
          mimetype: f.metadata?.mimetype,
          created_at: f.created_at || new Date().toISOString(),
          metadata: f.metadata,
        }));
    });

    const rootPromise = supabase.storage
      .from("project-files")
      .list(projectId, { sortBy: { column: "created_at", order: "desc" } })
      .then(({ data, error }) => {
        if (error || !data) return [];
        return data
          .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.id)
          .map((f) => ({
            id: f.id || `${projectId}/${f.name}`,
            name: f.name.replace(/^\d+_/, "").replace(/^\d+-/, ""),
            path: `${projectId}/${f.name}`,
            size: f.metadata?.size,
            mimetype: f.metadata?.mimetype,
            created_at: f.created_at || new Date().toISOString(),
            metadata: f.metadata,
          }));
      });

    const timeout = new Promise<any[]>((resolve) => window.setTimeout(() => resolve([]), 4000));
    const allResults = await Promise.race([
      Promise.all([...listPromises, rootPromise]).then((res) => res.flat()),
      timeout,
    ]);

    remoteFiles.push(...allResults);
  } catch (err) {
    console.warn("Could not fetch remote files:", err);
  }

  // Merge with local files
  const localFiles = getLocalProjectFiles(projectId);
  const map = new Map<string, StoredProjectFile>();

  remoteFiles.forEach((f) => map.set(f.name, f));
  localFiles.forEach((f) => {
    if (!map.has(f.name)) {
      map.set(f.name, f);
    } else {
      const existing = map.get(f.name)!;
      map.set(f.name, {
        ...existing,
        url: f.url || existing.url,
        isLocalFallback: f.isLocalFallback,
      });
    }
  });

  return Array.from(map.values());
}
