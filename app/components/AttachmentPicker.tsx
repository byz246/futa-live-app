"use client";

import { useRef, type ChangeEvent } from "react";
import { FilePreview, MP_STYLES } from "./MediaPicker";

type Props = {
  photos: File[];
  doc: File | null;
  maxPhotos: number;
  busy?: boolean;
  message?: string;
  onAddPhotos: (files: File[]) => void;
  onAddDocument: (file: File) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveDocument: () => void;
};

export default function AttachmentPicker({
  photos,
  doc,
  maxPhotos,
  busy,
  message,
  onAddPhotos,
  onAddDocument,
  onRemovePhoto,
  onRemoveDocument,
}: Props) {
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) onAddPhotos(files);
  }

  function handleDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onAddDocument(file);
  }

  return (
    <div className="mp">
      <p className="mp-title">
        Add a photo or file <span>(optional)</span>
      </p>

      <div className="mp-buttons">
        <button
          type="button"
          className="mp-btn"
          disabled={busy}
          onClick={() => photoRef.current?.click()}
        >
          🖼️ Choose photo
        </button>
        <button
          type="button"
          className="mp-btn"
          disabled={busy}
          onClick={() => docRef.current?.click()}
        >
          📎 Attach file
        </button>
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handlePhotos}
      />
      <input
        ref={docRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        hidden
        onChange={handleDocument}
      />

      {(photos.length > 0 || doc) && (
        <div className="mp-grid">
          {photos.map((photo, index) => (
            <div className="mp-thumb" key={`${photo.name}-${index}`}>
              <FilePreview file={photo} />
              <button
                type="button"
                className="mp-remove"
                aria-label="Remove photo"
                onClick={() => onRemovePhoto(index)}
              >
                ×
              </button>
            </div>
          ))}
          {doc && (
            <div className="mp-thumb">
              <div className="mp-video">
                <span>📎</span>
                <span>{doc.name}</span>
              </div>
              <button
                type="button"
                className="mp-remove"
                aria-label="Remove file"
                onClick={onRemoveDocument}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {busy && <p className="mp-hint">Getting your photo ready...</p>}
      {message && <p className="mp-note">{message}</p>}
      <p className="mp-hint">
        Up to {maxPhotos} photos and 1 file (PDF, Word, Excel or PowerPoint).
      </p>

      <style jsx global>{MP_STYLES}</style>
    </div>
  );
}