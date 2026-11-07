"use client";

import { useState } from "react";
import { createListing, explainError } from "@/lib/listings";
import {
  MAX_PHOTOS,
  isVideo,
  prepareImage,
  removeMediaByUrl,
  uploadMedia,
  videoProblem,
} from "@/lib/uploads";
import MediaPicker, { FilePreview, MP_STYLES } from "./MediaPicker";
import { STYLES, normalizeWhatsapp } from "./MarketplacePostForm";

export type ReportKind = "lost" | "found";

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const LF_STYLES = `
  .lf-tag { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; }
  .lf-tag-lost { background: rgba(229, 57, 53, 0.18); color: #ff6b66; border: 1px solid #e53935; }
  .lf-tag-found { background: rgba(46, 160, 67, 0.18); color: #4cd964; border: 1px solid #2ea043; }
  .lf-proof { margin: 4px 0 16px; padding: 12px 14px; border-radius: 12px; background: rgba(46, 160, 67, 0.12); border: 1px solid #2ea043; font-size: 0.9rem; }
`;

export default function LostFoundPostForm({
  kind,
  onCancel,
  onPosted,
}: {
  kind: ReportKind;
  onCancel: () => void;
  onPosted: () => void;
}) {
  const isLost = kind === "lost";
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(todayString());
  const [whatsapp, setWhatsapp] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [mediaMessage, setMediaMessage] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addFiles(files: File[]) {
    setMediaBusy(true);
    setMediaMessage("");
    let nextPhotos = [...photos];
    let nextVideo = video;
    let message = "";

    for (const file of files) {
      if (isVideo(file)) {
        const problem = videoProblem(file);
        if (problem) {
          message = problem;
          continue;
        }
        nextVideo = file;
        continue;
      }
      if (nextPhotos.length >= MAX_PHOTOS) {
        message = `You can add up to ${MAX_PHOTOS} photos.`;
        continue;
      }
      const result = await prepareImage(file);
      if (!result.file) {
        message = result.error ?? "This photo could not be used.";
        continue;
      }
      nextPhotos = [...nextPhotos, result.file];
    }

    setPhotos(nextPhotos);
    setVideo(nextVideo);
    setMediaMessage(message);
    setMediaBusy(false);
  }

  function checkForm(): string {
    if (!name.trim()) return "Please enter the item name.";
    if (name.trim().length > 120) return "The item name is too long.";
    if (!location.trim()) {
      return isLost
        ? "Please enter where you last saw it."
        : "Please enter where it was found.";
    }
    if (location.trim().length > 160) return "The location is too long.";
    if (!date) return "Please choose the date.";
    if (date > todayString()) return "The date cannot be in the future.";
    if (!normalizeWhatsapp(whatsapp)) {
      return "Please enter a valid WhatsApp number, for example 08012345678.";
    }
    return "";
  }

  function goToPreview() {
    const problem = checkForm();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep("preview");
  }

  async function submit() {
    if (submitting || mediaBusy) return;
    const problem = checkForm();
    if (problem) {
      setError(problem);
      setStep("edit");
      return;
    }
    setSubmitting(true);
    setError("");

    const uploaded: string[] = [];
    const imageUrls: string[] = [];

    for (const photo of photos) {
      const { url, error: uploadError } = await uploadMedia(photo, "image");
      if (uploadError || !url) {
        await removeMediaByUrl(uploaded);
        setSubmitting(false);
        setError("A photo could not be uploaded. " + explainError(uploadError));
        return;
      }
      uploaded.push(url);
      imageUrls.push(url);
    }

    let videoUrl: string | undefined;
    if (video) {
      const { url, error: uploadError } = await uploadMedia(video, "video");
      if (uploadError || !url) {
        await removeMediaByUrl(uploaded);
        setSubmitting(false);
        setError("The video could not be uploaded. " + explainError(uploadError));
        return;
      }
      uploaded.push(url);
      videoUrl = url;
    }

    const { error: saveError } = await createListing({
      section: "lost_found",
      lost_found_type: kind,
      title: name.trim(),
      location: location.trim(),
      event_date: date,
      contact_whatsapp: normalizeWhatsapp(whatsapp) ?? undefined,
      image_urls: imageUrls,
      video_url: videoUrl,
    });

    if (saveError) {
      await removeMediaByUrl(uploaded);
      setSubmitting(false);
      setError(explainError(saveError));
      return;
    }

    setSubmitting(false);
    onPosted();
  }

  if (step === "preview") {
    return (
      <section className="section-page">
        <button className="back-button" onClick={() => setStep("edit")}>
          <span>←</span> Edit details
        </button>

        <div className="pf-head">
          <h1>Preview Report</h1>
          <p>This is how other students will see your post.</p>
        </div>

        <article className="pf-card">
          <span className={`lf-tag ${isLost ? "lf-tag-lost" : "lf-tag-found"}`}>
            {isLost ? "LOST" : "FOUND"}
          </span>

          {(photos.length > 0 || video) && (
            <div className="mp-grid">
              {photos.map((photo, index) => (
                <div className="mp-thumb" key={`${photo.name}-${index}`}>
                  <FilePreview file={photo} />
                </div>
              ))}
              {video && (
                <div className="mp-thumb">
                  <div className="mp-video">
                    <span>🎥</span>
                    <span>{video.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <h3 style={{ marginTop: 10 }}>{name.trim()}</h3>
          <div className="pf-meta">
            <span>
              {isLost ? "Last seen" : "Found at"}: {location.trim()}
            </span>
          </div>
          <div className="pf-meta">
            <span>Date: {formatDate(date)}</span>
          </div>
          <p className="pf-contact">WhatsApp: +{normalizeWhatsapp(whatsapp)}</p>
          {!isLost && (
            <div className="lf-proof" style={{ marginTop: 12 }}>
              Come with proof of ownership.
            </div>
          )}
        </article>

        {error && <div className="notice-panel">{error}</div>}

        <div className="pf-actions">
          <button
            className="pf-secondary"
            onClick={() => setStep("edit")}
            disabled={submitting}
          >
            Edit Details
          </button>
          <button
            className="primary-button"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>

        <style jsx global>{STYLES}</style>
        <style jsx global>{MP_STYLES}</style>
        <style jsx global>{LF_STYLES}</style>
      </section>
    );
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onCancel}>
        <span>←</span> Back to Lost & Found
      </button>

      <div className="pf-head">
        <span className={`lf-tag ${isLost ? "lf-tag-lost" : "lf-tag-found"}`}>
          {isLost ? "LOST" : "FOUND"}
        </span>
        <h1>{isLost ? "Report a Lost Item" : "Report a Found Item"}</h1>
        <p>Fields marked * are required.</p>
      </div>

      {!isLost && (
        <div className="lf-proof">
          Your post will tell people to come with proof of ownership. Check
          it privately before you hand the item over.
        </div>
      )}

      <div className="pf-field">
        <label htmlFor="lf-name">Item name *</label>
        <input
          id="lf-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={isLost ? "What did you lose?" : "What did you find?"}
          maxLength={120}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="lf-location">
          {isLost ? "Last seen location *" : "Where was it found? *"}
        </label>
        <input
          id="lf-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder={
            isLost ? "Where did you last see it?" : "Enter the location"
          }
          maxLength={160}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="lf-date">Date *</label>
        <input
          id="lf-date"
          type="date"
          value={date}
          max={todayString()}
          onChange={(event) => setDate(event.target.value)}
          style={{ colorScheme: "dark" }}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="lf-whatsapp">WhatsApp number *</label>
        <input
          id="lf-whatsapp"
          value={whatsapp}
          inputMode="tel"
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="Enter WhatsApp number"
        />
      </div>

      <MediaPicker
        photos={photos}
        video={video}
        maxPhotos={MAX_PHOTOS}
        busy={mediaBusy}
        message={mediaMessage}
        onAddFiles={(files) => void addFiles(files)}
        onRemovePhoto={(index) =>
          setPhotos((current) => current.filter((_, i) => i !== index))
        }
        onRemoveVideo={() => setVideo(null)}
      />

      {error && <div className="notice-panel">{error}</div>}

      <div className="pf-actions">
        <button className="pf-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={goToPreview}
          disabled={mediaBusy}
        >
          Preview Report
        </button>
      </div>

      <style jsx global>{STYLES}</style>
      <style jsx global>{LF_STYLES}</style>
    </section>
  );
}