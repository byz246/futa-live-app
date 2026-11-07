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
import { STYLES, normalizeWhatsapp } from "./MarketplacePostForm";
import { formatDate } from "./LostFoundPostForm";

type Level = "100L" | "200L";

export function formatTime(value: string | null) {
  if (!value) return "";
  const [h, m] = value.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m} ${suffix}`;
}

// Turns mts201 or MTS 201 into MTS 201.
function normalizeCourse(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^([A-Z]{2,5})(\d{3}[A-Z]?)$/);
  return match ? `${match[1]} ${match[2]}` : null;
}

const TF_STYLES = `
  .tf-free { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; background: rgba(57, 132, 255, 0.18); color: #72aaff; border: 1px solid #3984ff; }
  .tf-times { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
`;

export default function TutorialsPostForm({
  onCancel,
  onPosted,
}: {
  onCancel: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState<"" | Level>("");
  const [tutor, setTutor] = useState("");
  const [organiser, setOrganiser] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [venue, setVenue] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
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
    if (!normalizeCourse(course)) {
      return "Please enter a valid course code, for example MTS 201.";
    }
    if (!level) return "Please choose 100L or 200L.";
    if (!tutor.trim()) return "Please enter the tutor name.";
    if (tutor.trim().length > 120) return "The tutor name is too long.";
    if (!organiser.trim()) return "Please enter the sponsor or organiser name.";
    if (organiser.trim().length > 120) return "The organiser name is too long.";
    if (start && end && end <= start) {
      return "The end time must be after the start time.";
    }
    if (venue.trim().length > 160) return "The venue is too long.";
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
      section: "tutorials",
      title: normalizeCourse(course) ?? course.trim(),
      level: level as Level,
      tutor_name: tutor.trim(),
      organiser_name: organiser.trim(),
      event_date: date || undefined,
      start_time: start || undefined,
      end_time: end || undefined,
      location: venue.trim(),
      contact_whatsapp: normalizeWhatsapp(whatsapp) ?? undefined,
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
          <h1>Preview Tutorial</h1>
          <p>This is how other students will see your post.</p>
        </div>

        <article className="pf-card">
          <span className="tf-free">FREE</span>
          <h3 style={{ marginTop: 10 }}>{normalizeCourse(course)}</h3>
          <div className="pf-meta">
            <span className="pf-badge">Level: {level}</span>
          </div>
          <p className="pf-contact">Tutor: {tutor.trim()}</p>
          <p className="pf-contact">Organiser: {organiser.trim()}</p>
          {date && <p className="pf-contact">Date: {formatDate(date)}</p>}
          {start && <p className="pf-contact">From: {formatTime(start)}</p>}
          {end && <p className="pf-contact">To: {formatTime(end)}</p>}
          {venue.trim() && <p className="pf-contact">Venue: {venue.trim()}</p>}
          <p className="pf-contact">
            Organiser WhatsApp: +{normalizeWhatsapp(whatsapp)}
          </p>

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
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>

        <style jsx global>{STYLES}</style>
        <style jsx global>{MP_STYLES}</style>
        <style jsx global>{TF_STYLES}</style>
      </section>
    );
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onCancel}>
        <span>←</span> Back to Tutorials
      </button>

      <div className="pf-head">
        <span className="tf-free">FREE - ALWAYS</span>
        <h1>Post Tutorial</h1>
        <p>Fields marked * are required.</p>
      </div>

      <div className="pf-field">
        <label htmlFor="tf-course">Course code *</label>
        <input
          id="tf-course"
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          placeholder="e.g. MTS 201, CSC 101, IFS 201"
          maxLength={12}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="tf-level">Level *</label>
        <select
          id="tf-level"
          value={level}
          onChange={(event) => setLevel(event.target.value as "" | Level)}
        >
          <option value="">Select level</option>
          <option value="100L">100L</option>
          <option value="200L">200L</option>
        </select>
      </div>

      <div className="pf-field">
        <label htmlFor="tf-tutor">Tutor name *</label>
        <input
          id="tf-tutor"
          value={tutor}
          onChange={(event) => setTutor(event.target.value)}
          placeholder="Person teaching"
          maxLength={120}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="tf-organiser">Sponsor or organiser name *</label>
        <input
          id="tf-organiser"
          value={organiser}
          onChange={(event) => setOrganiser(event.target.value)}
          placeholder="Person arranging the tutorial"
          maxLength={120}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="tf-date">Tutorial date</label>
        <input
          id="tf-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          style={{ colorScheme: "dark" }}
        />
      </div>

      <div className="tf-times">
        <div className="pf-field">
          <label htmlFor="tf-from">From (start time)</label>
          <input
            id="tf-from"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div className="pf-field">
          <label htmlFor="tf-to">To (end time)</label>
          <input
            id="tf-to"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>
      </div>

      <div className="pf-field">
        <label htmlFor="tf-venue">Venue</label>
        <input
          id="tf-venue"
          value={venue}
          onChange={(event) => setVenue(event.target.value)}
          placeholder="Where will it hold?"
          maxLength={160}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="tf-whatsapp">Organiser WhatsApp number *</label>
        <input
          id="tf-whatsapp"
          value={whatsapp}
          inputMode="tel"
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="Enter WhatsApp number"
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
          Preview Tutorial
        </button>
      </div>

      <style jsx global>{STYLES}</style>
      <style jsx global>{TF_STYLES}</style>
    </section>
  );
}