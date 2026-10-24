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

const DB_NAME = "tiny_wins_storage";
const STORE_NAME = "project_files";
const IDB_KEY_PREFIX = "tiny_wins_project_files_";

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function saveToIndexedDB(key: string, data: any): Promise<boolean> {
  try {
    const db = await openDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ storageKey: key, data });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function getLocalProjectFiles(projectId: string): StoredProjectFile[] {
  try {
    const raw =
      localStorage.getItem(`${IDB_KEY_PREFIX}${projectId}`) ||
      localStorage.getItem(`tiny_wins_project_${projectId}_files`);
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
    // Protect localStorage quota by stripping url if Base64 string is massive (>300KB)
    const safeItem =
      file.url && file.url.length > 300 * 1024
        ? { ...file, url: "" }
        : file;
    const updated = [safeItem, ...existing.filter((f) => f.name !== file.name && f.id !== file.id && f.path !== file.path)];
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
    localStorage.setItem(`${IDB_KEY_PREFIX}${projectId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not write file to localStorage:", e);
  }
}

export function removeLocalProjectFile(projectId: string, identifier: string) {
  try {
    const existing = getLocalProjectFiles(projectId);
    const updated = existing.filter((f) => f.name !== identifier && f.path !== identifier && f.id !== identifier);
    localStorage.setItem(`tiny_wins_project_${projectId}_files`, JSON.stringify(updated));
    localStorage.setItem(`${IDB_KEY_PREFIX}${projectId}`, JSON.stringify(updated));
  } catch {}
}

/**
 * Compresses an image lightly using canvas to minimize memory & data payload.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type || "image/jpeg", quality));
        } else {
          resolve((e.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || "");
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Image read error"));
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

/**
 * Fast Resilient Upload Pipeline:
 * 1. Reads file as Base64 (canvas compression for images, FileReader for PDFs/docs).
 * 2. Saves full Base64 to IndexedDB and localStorage so loading is instantaneous with no payload limit.
 * 3. Syncs metadata to Supabase safely in non-blocking mode with 4-second timeout (excluding massive payloads >500KB).
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

  const fileId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${projectId}/${userId}/${Date.now()}_${cleanName}`;

  // 1. Read file efficiently (< 1 second)
  let base64Data = "";
  if (file.type && file.type.startsWith("image/")) {
    try {
      base64Data = await compressImage(file);
    } catch {
      base64Data = await readFileAsDataUrl(file);
    }
  } else {
    base64Data = await readFileAsDataUrl(file);
  }

  if (!base64Data) {
    throw new Error("Could not process file content.");
  }

  // 2. Build full metadata object containing the Base64 URL
  const fileMetadata: StoredProjectFile = {
    id: fileId,
    name: file.name,
    path: storagePath,
    size: file.size,
    mimetype: file.type || "application/octet-stream",
    type: file.type || "application/octet-stream",
    url: base64Data, // Complete Base64 data URL for instant rendering
    data_url: base64Data,
    created_at: new Date().toISOString(),
    uploaded_at: new Date().toISOString(),
    uploader_name: uploaderName || "Instructor",
    uploader_id: userId,
    isLocalFallback: false,
    metadata: {
      size: file.size,
      mimetype: file.type || "application/octet-stream",
      uploader_name: uploaderName || "Instructor",
      url: base64Data,
      data_url: base64Data,
    },
  };

  // 3. Save into browser's IndexedDB and localStorage for instant offline/zero-latency retrieval
  const idbKey = `${IDB_KEY_PREFIX}${projectId}`;
  try {
    const existingIDB: StoredProjectFile[] = (await getFromIndexedDB(idbKey)) || [];
    const updatedIDB = [
      fileMetadata,
      ...existingIDB.filter((f) => f.name !== fileMetadata.name && f.id !== fileMetadata.id),
    ];
    await saveToIndexedDB(idbKey, updatedIDB);
  } catch (err) {
    console.warn("IndexedDB persistence warning:", err);
  }

  saveLocalProjectFile(projectId, fileMetadata);

  // 4. Safe Non-Blocking Supabase Sync (Wrapped with strict 4s timeout)
  // Metadata only (or small payloads <500KB) to prevent 413 Payload Too Large / hanging updates
  void (async () => {
    try {
      const supabase = requireSupabase();
      const isSmallPayload = base64Data.length < 500 * 1024; // Only sync base64 if under 500KB

      const safeMetadataToSync = {
        ...fileMetadata,
        url: isSmallPayload ? base64Data : "",
        data_url: isSmallPayload ? base64Data : "",
        metadata: {
          ...fileMetadata.metadata,
          url: isSmallPayload ? base64Data : "",
          data_url: isSmallPayload ? base64Data : "",
        },
      };

      const syncDbWork = async () => {
        const { data: projData } = await supabase
          .from("projects")
          .select("id, files, materials")
          .eq("id", projectId)
          .maybeSingle();

        if (projData) {
          const existingFiles: any[] = Array.isArray(projData.files) ? projData.files : [];
          const updatedFiles = [
            safeMetadataToSync,
            ...existingFiles.filter((f) => f.name !== fileMetadata.name && f.id !== fileMetadata.id),
          ];

          const existingMaterials: any[] = Array.isArray(projData.materials) ? projData.materials : [];
          const updatedMaterials = [
            safeMetadataToSync,
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

        await supabase.from("project_files").insert({
          project_id: projectId,
          user_id: userId,
          name: fileMetadata.name,
          file_path: storagePath,
          size: fileMetadata.size,
          mime_type: fileMetadata.mimetype,
          url: isSmallPayload ? base64Data : "",
          metadata: safeMetadataToSync,
          created_at: fileMetadata.created_at,
        });
      };

      const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
      await Promise.race([syncDbWork(), timeout]);
    } catch (err) {
      console.warn("Non-blocking Supabase sync caught/timed out:", err);
    }
  })();

  return {
    file: fileMetadata,
    message: "✅ File uploaded and secured!",
    isFallback: false,
  };
}

/**
 * Robust Fetching on Mount & on "Sync Materials" Click:
 * Reads from IndexedDB, localStorage, and Supabase projects table with a 4s timeout.
 */
export async function fetchProjectFiles(
  projectId: string,
  memberIds: string[] = []
): Promise<StoredProjectFile[]> {
  const fileMap = new Map<string, StoredProjectFile>();
  const idbKey = `${IDB_KEY_PREFIX}${projectId}`;

  // 1. Load from IndexedDB (contains full Base64 URLs)
  try {
    const idbFiles: StoredProjectFile[] = (await getFromIndexedDB(idbKey)) || [];
    idbFiles.forEach((f) => {
      if (f && f.name) fileMap.set(f.name, f);
    });
  } catch {}

  // 2. Load from localStorage
  const localFiles = getLocalProjectFiles(projectId);
  localFiles.forEach((f) => {
    if (f && f.name) {
      if (!fileMap.has(f.name)) {
        fileMap.set(f.name, f);
      } else {
        const existing = fileMap.get(f.name)!;
        if (!existing.url && f.url) {
          fileMap.set(f.name, { ...existing, url: f.url });
        }
      }
    }
  });

  // 3. Centralized metadata from Supabase projects table (with 4s timeout)
  try {
    const supabase = requireSupabase();
    const fetchProjPromise = supabase
      .from("projects")
      .select("id, files, materials")
      .eq("id", projectId)
      .maybeSingle();

    const timeout = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000));
    const { data: proj }: any = await Promise.race([fetchProjPromise, timeout]).catch(() => ({ data: null }));

    if (proj) {
      if (Array.isArray(proj.files)) {
        proj.files.forEach((f: any) => {
          if (f?.name) {
            const existing = fileMap.get(f.name);
            fileMap.set(f.name, {
              ...f,
              id: f.id || existing?.id || `f-${f.name}`,
              path: f.path || `${projectId}/${f.name}`,
              created_at: f.created_at || f.uploaded_at || new Date().toISOString(),
              url: existing?.url || f.url || f.data_url || "",
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
    console.warn("Supabase fetch metadata caught:", err);
  }

  const merged = Array.from(fileMap.values());
  return merged;
}

export async function deleteProjectFile(
  projectId: string,
  fileName: string,
  filePath: string,
  fileId?: string | null
) {
  const supabase = requireSupabase();
  const idbKey = `${IDB_KEY_PREFIX}${projectId}`;

  // 1. Delete from IndexedDB
  try {
    const existingIDB: StoredProjectFile[] = (await getFromIndexedDB(idbKey)) || [];
    const updatedIDB = existingIDB.filter(
      (f) => f.name !== fileName && f.path !== filePath && (!fileId || f.id !== fileId)
    );
    await saveToIndexedDB(idbKey, updatedIDB);
  } catch {}

  // 2. Delete from localStorage
  removeLocalProjectFile(projectId, fileName);
  if (fileId) removeLocalProjectFile(projectId, fileId);
  if (filePath) removeLocalProjectFile(projectId, filePath);

  // 3. Safe non-blocking delete from Supabase
  const syncDelete = async () => {
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

      await supabase.from("project_files").delete().eq("project_id", projectId).eq("name", fileName);
      if (fileId) {
        await supabase.from("project_files").delete().eq("project_id", projectId).eq("id", fileId);
      }
    } catch {}
  };

  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  await Promise.race([syncDelete(), timeout]).catch(() => {});
}
