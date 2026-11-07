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
import {
  STYLES,
  formatNaira,
  normalizeWhatsapp,
} from "./MarketplacePostForm";

type Fulfilment = "pickup" | "delivery" | "both";

export const FULFILMENT_LABEL: Record<string, string> = {
  pickup: "Pickup only",
  delivery: "Delivery available",
  both: "Pickup or delivery",
};

export default function FoodPostForm({
  onCancel,
  onPosted,
}: {
  onCancel: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [fulfilment, setFulfilment] = useState<"" | Fulfilment>("");
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
    if (!name.trim()) return "Please enter the food name.";
    if (name.trim().length > 120) return "The food name is too long.";
    const amount = Number(price);
    if (!price || !Number.isFinite(amount) || amount <= 0) {
      return "Please enter a valid price in naira.";
    }
    if (amount > 100000000) return "That price is too high.";
    if (!location.trim()) return "Please enter the pickup or delivery location.";
    if (location.trim().length > 160) return "The location is too long.";
    if (!fulfilment) return "Please choose a fulfilment option.";
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
      section: "food",
      title: name.trim(),
      price: Number(price),
      location: location.trim(),
      fulfilment: fulfilment as Fulfilment,
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
          <h1>Preview Food</h1>
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
              {fulfilment ? FULFILMENT_LABEL[fulfilment] : ""}
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
        <span>←</span> Back to Food & Snacks
      </button>

      <div className="pf-head">
        <h1>Post Food</h1>
        <p>Fields marked * are required.</p>
      </div>

      <div className="pf-field">
        <label htmlFor="ff-name">Food name *</label>
        <input
          id="ff-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter food name"
          maxLength={120}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="ff-price">Price (₦) *</label>
        <input
          id="ff-price"
          value={price}
          inputMode="numeric"
          onChange={(event) =>
            setPrice(event.target.value.replace(/[^\d]/g, ""))
          }
          placeholder="Enter price in naira"
        />
      </div>

      <div className="pf-field">
        <label htmlFor="ff-location">Pickup/delivery location *</label>
        <input
          id="ff-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Where can customers get the food?"
          maxLength={160}
        />
      </div>

      <div className="pf-field">
        <label htmlFor="ff-fulfilment">Fulfilment option *</label>
        <select
          id="ff-fulfilment"
          value={fulfilment}
          onChange={(event) =>
            setFulfilment(event.target.value as "" | Fulfilment)
          }
        >
          <option value="">Select an option</option>
          <option value="pickup">Pickup only</option>
          <option value="delivery">Delivery available</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div className="pf-field">
        <label htmlFor="ff-whatsapp">WhatsApp number *</label>
        <input
          id="ff-whatsapp"
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
          Preview Food
        </button>
      </div>

      <style jsx global>{STYLES}</style>
    </section>
  );
}