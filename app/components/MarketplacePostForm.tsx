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

export const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  used: "Used",
};

export function formatNaira(value: number | null) {
  if (value === null || value === undefined) return "";
  return "₦" + Number(value).toLocaleString("en-NG");
}

// Accepts 08012345678 or +234 801 234 5678 and keeps digits only.
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (/^0\d{10}$/.test(digits)) digits = "234" + digits.slice(1);
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

type Condition = "new" | "like_new" | "used";

export const STYLES = `
  .pf-head h1 { margin: 12px 0 4px; font-size: 1.6rem; }
  .pf-head p { margin: 0 0 16px; opacity: 0.75; }
  .pf-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; min-width: 0; }
  .pf-field label { font-size: 0.9rem; font-weight: 600; }
  .pf-field input, .pf-field select {
    width: 100%;
    box-sizing: border-box;
    background: #080d18;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 16px;
  }
  .pf-field input:focus, .pf-field select:focus { outline: 2px solid #3984ff; border-color: #3984ff; }
  .pf-actions { display: flex; gap: 12px; margin-top: 18px; }
  .pf-actions button { flex: 1; min-width: 0; }
  .pf-secondary {
    background: transparent;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 1rem;
    cursor: pointer;
  }
  .pf-card {
    background: #101827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px;
    min-width: 0;
  }
  .pf-card h3 { margin: 0 0 6px; font-size: 1.05rem; overflow-wrap: anywhere; }
  .pf-price { margin: 0 0 8px; color: #72aaff; font-weight: 700; font-size: 1.1rem; }
  .pf-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.85rem; opacity: 0.85; }
  .pf-badge { border-radius: 999px; padding: 2px 10px; background: rgba(57, 132, 255, 0.15); color: #72aaff; }
  .pf-contact { margin: 10px 0 0; font-size: 0.85rem; opacity: 0.8; }
`;

export default function MarketplacePostForm({
  onCancel,
  onPosted,
}: {
  onCancel: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"" | Condition>("");
  const [location, setLocation] = useState("");
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
    if (!name.trim()) return "Please enter the product name.";
    if (name.trim().length > 120) return "The product name is too long.";
    const amount = Number(price);
    if (!price || !Number.isFinite(amount) || amount <= 0) {
      return "Please enter a valid price in naira.";
    }
    if (amount > 100000000) return "That price is too high.";
    if (!condition) return "Please choose the condition.";
    if (!location.trim()) return "Please enter where the product is.";
    if (location.trim().length > 160) return "The location is too long.";
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
      section: "marketplace",
      title: name.trim(),
      price: Number(price),
      item_condition: condition as Condition,
      location: location.trim(),
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
          <h1>Preview Product</h1>
          <p>This is how other students will see your post.</p>
        </div>

        <article className="pf-card">
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
          <h3>{name.trim()}</h3>
          <p className="pf-price">{formatNaira(Number(price))}</p>
          <div className="pf-meta">
            <span className="pf-badge">
              {condition ? CONDITION_LABEL[condition] : ""}
            </span>
            <span>{location.trim()}</span>
          </div>
          <p className="pf-contact">WhatsApp: +{normalizeWhatsapp(whatsapp)}</p>
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
      </section>
    );
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onCancel}>
        <span>←</span> Back to Marketplace
      </button>

      <div className="pf-head">
        <h1>Post a Product</h1>
        <p>Fields marked * are required.</p>
      </div>

      <div className="pf-field">
        <label htmlFor="pf-name">Product name *</label>
        <input
          id="pf-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter product name"
          maxLength={120}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="pf-price">Price (₦) *</label>
        <input
          id="pf-price"
          value={price}
          inputMode="numeric"
          onChange={(event) =>
            setPrice(event.target.value.replace(/[^\d]/g, ""))
          }
          placeholder="Enter price in naira"
        />
      </div>

      <div className="pf-field">
        <label htmlFor="pf-condition">Condition *</label>
        <select
          id="pf-condition"
          value={condition}
          onChange={(event) =>
            setCondition(event.target.value as "" | Condition)
          }
        >
          <option value="">Select condition</option>
          <option value="new">New</option>
          <option value="like_new">Like new</option>
          <option value="used">Used</option>
        </select>
      </div>

      <div className="pf-field">
        <label htmlFor="pf-location">Location *</label>
        <input
          id="pf-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Where is the product?"
          maxLength={160}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="pf-whatsapp">WhatsApp number *</label>
        <input
          id="pf-whatsapp"
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
          Preview Product
        </button>
      </div>

      <style jsx global>{STYLES}</style>
    </section>
  );
}