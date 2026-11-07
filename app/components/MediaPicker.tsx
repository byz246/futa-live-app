"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

export const MP_STYLES = `
  .mp { margin: 4px 0 16px; }
  .mp-title { margin: 0 0 8px; font-size: 0.9rem; font-weight: 600; }
  .mp-title span { font-weight: 400; opacity: 0.6; }
  .mp-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mp-btn {
    background: #101827;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 12px;
    padding: 12px 8px;
    font-size: 0.95rem;
    cursor: pointer;
    min-width: 0;
  }
  .mp-btn:disabled { opacity: 0.5; }
  .mp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
    margin-top: 12px;
  }
  .mp-thumb {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    overflow: hidden;
    background: #101827;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .mp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .mp-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.7);
    color: #ffffff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .mp-video {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px;
    text-align: center;
    font-size: 0.75rem;
    height: 100%;
    box-sizing: border-box;
    overflow-wrap: anywhere;
  }
  .mp-note { margin: 10px 0 0; font-size: 0.85rem; color: #ffb4b4; }
  .mp-hint { margin: 10px 0 0; font-size: 0.8rem; opacity: 0.6; }
`;

export function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Selected photo preview" />
  );
}

type Props = {
  photos: File[];
  video: File | null;
  maxPhotos: number;
  busy?: boolean;
  message?: string;
  onAddFiles: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveVideo: () => void;
};

export default function MediaPicker({
  photos,
  video,
  maxPhotos,
  busy,
  message,
  onAddFiles,
  onRemovePhoto,
  onRemoveVideo,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) onAddFiles(files);
  }

  return (
    <div className="mp">
      <p className="mp-title">
        Add photos or video <span>(optional)</span>
      </p>

      <div className="mp-buttons">
        <button
          type="button"
          className="mp-btn"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          📷 Take photo
        </button>
        <button
          type="button"
          className="mp-btn"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
        >
          🖼️ Choose from phone
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleChange}
      />

      {(photos.length > 0 || video) && (
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
          {video && (
            <div className="mp-thumb">
              <div className="mp-video">
                <span>🎥</span>
                <span>{video.name}</span>
              </div>
              <button
                type="button"
                className="mp-remove"
                aria-label="Remove video"
                onClick={onRemoveVideo}
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
        Up to {maxPhotos} photos and 1 video. Photos are shrunk automatically.
      </p>

      <style jsx global>{MP_STYLES}</style>
    </div>
  );
}