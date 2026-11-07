import { supabase } from "@/lib/supabase";

export const MAX_PHOTOS = 5;
export const MAX_VIDEO_MB = 30;

const ALLOWED_IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const ALLOWED_VIDEOS = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
];

export function isVideo(file: File) {
  return file.type.startsWith("video/");
}

export function videoProblem(file: File): string {
  if (!ALLOWED_VIDEOS.includes(file.type)) {
    return "This video type is not supported. Please use an MP4 video.";
  }
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return `The video is too large. Please keep it under ${MAX_VIDEO_MB} MB.`;
  }
  return "";
}

// Shrinks big phone photos so they upload quickly and fit the size limit.
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function prepareImage(
  file: File
): Promise<{ file?: File; error?: string }> {
  const prepared = await compressImage(file);
  if (!ALLOWED_IMAGES.includes(prepared.type)) {
    return { error: "This photo type is not supported. Please use a JPG or PNG photo." };
  }
  if (prepared.size > 5 * 1024 * 1024) {
    return { error: "This photo is too large. Please choose a smaller one." };
  }
  return { file: prepared };
}

// Files are saved in a folder named after the signed-in user.
export async function uploadMedia(file: File, kind: "image" | "video") {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { url: null, error: new Error("Please log in first.") };
  }
  const bucket = kind === "image" ? "post-images" : "post-videos";
  const fallback = kind === "image" ? "jpg" : "mp4";
  const extension =
    (file.name.split(".").pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") ||
    fallback;
  const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return { url: null, error };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// Deletes uploaded files when a post is deleted or a post fails to save.
export async function removeMediaByUrl(urls: (string | null | undefined)[]) {
  const byBucket = new Map<string, string[]>();
  for (const url of urls) {
    if (!url) continue;
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const bucket = match[1];
    const path = decodeURIComponent(match[2]);
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  for (const [bucket, paths] of byBucket) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

export const MAX_DOC_MB = 10;

const DOC_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
};

function docExtension(file: File) {
  return (file.name.split(".").pop() || "").toLowerCase();
}

export function documentProblem(file: File): string {
  if (!DOC_TYPES[docExtension(file)]) {
    return "This file type is not supported. Please use a PDF, Word, Excel, PowerPoint or text file.";
  }
  if (file.size > MAX_DOC_MB * 1024 * 1024) {
    return `The file is too large. Please keep it under ${MAX_DOC_MB} MB.`;
  }
  return "";
}

export async function uploadDocument(file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { url: null, error: new Error("Please log in first.") };
  }
  const extension = docExtension(file);
  const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("post-files").upload(path, file, {
    contentType: DOC_TYPES[extension],
    cacheControl: "31536000",
  });
  if (error) return { url: null, error };

  const { data } = supabase.storage.from("post-files").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}