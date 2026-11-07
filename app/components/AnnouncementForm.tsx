"use client";

import { useState } from "react";
import { createListing, explainError } from "@/lib/listings";
import {
  MAX_PHOTOS,
  documentProblem,
  prepareImage,
  removeMediaByUrl,
  uploadDocument,
  uploadMedia,
} from "@/lib/uploads";
import { FilePreview, MP_STYLES } from "./MediaPicker";
import AttachmentPicker from "./AttachmentPicker";
import { STYLES } from "./MarketplacePostForm";
import { formatDate } from "./LostFoundPostForm";

const AN_STYLES = `
  .an-tag { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; background: rgba(57, 132, 255, 0.18); color: #72aaff; border: 1px solid #3984ff; }
  .an-text { margin: 10px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; }
  .an-textarea { width: 100%; box-sizing: border-box; min-height: 140px; resize: vertical; background: #080d18; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 12px; padding: 12px 14px; font-size: 16px; font-family: inherit; }
  .an-textarea:focus { outline: 2px solid #3984ff; border-color: #3984ff; }
`;

export default function AnnouncementForm({
  onCancel,
  onPosted,
}: {
  onCancel: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [notice, setNotice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [doc, setDoc] = useState<File | null>(null);
  const [mediaMessage, setMediaMessage] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addPhotos(files: File[]) {
    setMediaBusy(true);
    setMediaMessage("");
    let next = [...photos];
    let message = "";
    for (const file of files) {
      if (next.length >= MAX_PHOTOS) {
        message = `You can add up to ${MAX_PHOTOS} photos.`;
        continue;
      }
      const result = await prepareImage(file);
      if (!result.file) {
        message = result.error ?? "This photo could not be used.";
        continue;
      }
      next = [...next, result.file];
    }
    setPhotos(next);
    setMediaMessage(message);
    setMediaBusy(false);
  }

  function addDocument(file: File) {
    const problem = documentProblem(file);
    if (problem) {
      setMediaMessage(problem);
      return;
    }
    setMediaMessage("");
    setDoc(file);
  }

  function checkForm(): string {
    if (!notice.trim() && photos.length === 0 && !doc) {
      return "Please add the notice details, a photo or a file.";
    }
    if (notice.trim().length > 2000) return "The notice is too long.";
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

    let fileUrl: string | undefined;
    if (doc) {
      const { url, error: uploadError } = await uploadDocument(doc);
      if (uploadError || !url) {
        await removeMediaByUrl(uploaded);
        setSubmitting(false);
        setError("The file could not be uploaded. " + explainError(uploadError));
        return;
      }
      uploaded.push(url);
      fileUrl = url;
    }

    const { error: saveError } = await createListing({
      section: "announcements",
      description: notice.trim() || undefined,
      event_date: eventDate || undefined,
      image_urls: imageUrls,
      file_url: fileUrl,
      file_name: doc?.name,
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
          <h1>Preview Announcement</h1>
          <p>This is how students will see your post.</p>
        </div>

        <article className="pf-card">
          <span className="an-tag">ANNOUNCEMENT</span>
          {notice.trim() && <p className="an-text">{notice.trim()}</p>}
          {eventDate && (
            <p className="pf-contact">Event date: {formatDate(eventDate)}</p>
          )}

          {(photos.length > 0 || doc) && (
            <div className="mp-grid">
              {photos.map((photo, index) => (
                <div className="mp-thumb" key={`${photo.name}-${index}`}>
                  <FilePreview file={photo} />
                </div>
              ))}
              {doc && (
                <div className="mp-thumb">
                  <div className="mp-video">
                    <span>📎</span>
                    <span>{doc.name}</span>
                  </div>
                </div>
              )}
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
            {submitting ? "Posting..." : "Post Announcement"}
          </button>
        </div>

        <style jsx global>{STYLES}</style>
        <style jsx global>{MP_STYLES}</style>
        <style jsx global>{AN_STYLES}</style>
      </section>
    );
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onCancel}>
        <span>←</span> Back to Announcements
      </button>

      <div className="pf-head">
        <h1>Create Announcement</h1>
        <p>Add the notice details and relevant attachments.</p>
      </div>

      <div className="pf-field">
        <label htmlFor="an-notice">Notice details (when needed)</label>
        <textarea
          id="an-notice"
          className="an-textarea"
          value={notice}
          onChange={(event) => setNotice(event.target.value)}
          placeholder="Type the notice here"
          maxLength={2000}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="an-date">Relevant event date (when needed)</label>
        <input
          id="an-date"
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          style={{ colorScheme: "dark" }}
        />
      </div>

      <AttachmentPicker
        photos={photos}
        doc={doc}
        maxPhotos={MAX_PHOTOS}
        busy={mediaBusy}
        message={mediaMessage}
        onAddPhotos={(files) => void addPhotos(files)}
        onAddDocument={addDocument}
        onRemovePhoto={(index) =>
          setPhotos((current) => current.filter((_, i) => i !== index))
        }
        onRemoveDocument={() => setDoc(null)}
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
          Preview Announcement
        </button>
      </div>

      <style jsx global>{STYLES}</style>
      <style jsx global>{AN_STYLES}</style>
    </section>
  );
}