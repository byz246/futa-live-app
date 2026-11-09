"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/lib/admin";
import {
  deleteListing,
  explainError,
  fetchListing,
  fetchSavedIds,
  setListingStatus,
  toggleSaved,
  type Listing,
} from "@/lib/listings";
import { removeMediaByUrl } from "@/lib/uploads";
import EditPostForm from "./EditPostForm";
import { CONDITION_LABEL, formatNaira } from "./MarketplacePostForm";
import { FULFILMENT_LABEL } from "./FoodPostForm";
import { formatDate } from "./LostFoundPostForm";
import { formatTime } from "./TutorialsPostForm";

function whatsappLink(item: Listing) {
  let text = `Hello, I saw your FutaHub post: ${item.title ?? "your post"}.`;
  if (item.section === "marketplace" || item.section === "food") {
    text = `Hello, I saw your FutaHub post for ${item.title}. Is it still available?`;
  } else if (item.section === "tutorials") {
    text = `Hello, I saw your FutaHub post about the ${item.title} tutorial and I would like to join.`;
  } else if (item.section === "lost_found") {
    text =
      item.lost_found_type === "found"
        ? `Hello, I saw your FutaHub post about the found item: ${item.title}. I think it is mine and I can show proof of ownership.`
        : `Hello, I saw your FutaHub post about the lost item: ${item.title}. I may have found it.`;
  }
  return `https://wa.me/${item.contact_whatsapp}?text=${encodeURIComponent(text)}`;
}

function contactLabel(item: Listing) {
  if (item.section === "marketplace" || item.section === "food") {
    return "Contact Seller on WhatsApp";
  }
  if (item.section === "tutorials") return "Contact Organiser on WhatsApp";
  return "Contact on WhatsApp";
}

function getStatusAction(
  item: Listing
): { label: string; next: Listing["status"] } | null {
  if (item.section === "marketplace") {
    return item.status === "sold"
      ? { label: "Mark as available", next: "active" }
      : { label: "Mark as sold", next: "sold" };
  }
  if (item.section === "food") {
    return item.status === "sold_out"
      ? { label: "Mark as available", next: "active" }
      : { label: "Mark sold out", next: "sold_out" };
  }
  if (item.section === "lost_found") {
    return item.status === "resolved"
      ? { label: "Reopen", next: "active" }
      : { label: "Mark as resolved", next: "resolved" };
  }
  return null;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="pd-row">
      <span className="pd-label">{label}</span>
      <span className="pd-value">{value}</span>
    </div>
  );
}

export default function PostDetails({
  id,
  onClose,
}: {
  id: number;
  onClose: (changed: boolean) => void;
}) {
  const [item, setItem] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState(false);
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error: loadError } = await fetchListing(id);
      const { data: auth } = await supabase.auth.getUser();
      const { ids } = await fetchSavedIds();
      const admin = await checkIsAdmin();
      if (!active) return;
      if (loadError || !data) {
        setError(
          explainError(loadError) ||
            "This post could not be found. It may have been deleted."
        );
      } else {
        setItem(data);
      }
      setUserId(auth.user?.id ?? null);
      setSaved(ids.has(id));
      setIsAdmin(admin);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  function close() {
    onClose(changed);
  }

  async function handleSave() {
    if (!item || busy) return;
    setBusy(true);
    const next = !saved;
    const { error: saveError } = await toggleSaved(item.id, next);
    if (saveError) {
      setBanner(explainError(saveError));
    } else {
      setSaved(next);
      setChanged(true);
      setBanner(next ? "Saved. Find it under Saved." : "Removed from Saved.");
    }
    setBusy(false);
  }

  async function handleStatus(next: Listing["status"]) {
    if (!item || busy) return;
    setBusy(true);
    const { data, error: updateError } = await setListingStatus(item.id, next);
    if (updateError || !data) {
      setBanner(explainError(updateError) || "Could not update this post.");
    } else {
      setItem(data);
      setChanged(true);
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (!item || busy) return;
    setBusy(true);
    const { error: deleteError } = await deleteListing(item.id);
    if (deleteError) {
      setBanner(explainError(deleteError));
      setBusy(false);
      setConfirmDelete(false);
      return;
    }
    await removeMediaByUrl([...item.image_urls, item.video_url, item.file_url]);
    onClose(true);
  }

  if (loading || !item) {
    return (
      <div className="pd-overlay">
        <div className="pd-inner">
          <button className="back-button" onClick={close}>
            <span>←</span> Back
          </button>
          {loading ? (
            <div className="empty-panel">
              <div className="spinner" />
              <p>Loading post...</p>
            </div>
          ) : (
            <div className="notice-panel">{error}</div>
          )}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="pd-overlay">
        <div className="pd-inner">
          <EditPostForm
            item={item}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setItem(updated);
              setEditing(false);
              setChanged(true);
              setBanner("Your post has been updated.");
            }}
          />
        </div>
      </div>
    );
  }

  const isOwner = item.user_id === userId;
  const canManage = isOwner || isAdmin;
  const isLost = item.lost_found_type === "lost";
  const poster = item.profiles?.display_name ?? "a student";
  const statusAction = getStatusAction(item);

  return (
    <div className="pd-overlay">
      <div className="pd-inner">
        <button className="back-button" onClick={close}>
          <span>←</span> Back
        </button>

        {banner && <div className="pd-banner">{banner}</div>}

        <article className="pd-card">
          {item.image_urls.length > 0 && (
            <div className="pd-photos">
              {item.image_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={item.title ?? "Post photo"} loading="lazy" />
                </a>
              ))}
            </div>
          )}

          {item.video_url && (
            <video
              className="pd-video"
              src={item.video_url}
              controls
              playsInline
              preload="metadata"
            />
          )}

          <div className="pd-tags">
            {item.section === "lost_found" && (
              <span className={isLost ? "lf-tag lf-tag-lost" : "lf-tag lf-tag-found"}>
                {isLost ? "LOST" : "FOUND"}
              </span>
            )}
            {item.section === "tutorials" && (
              <>
                <span className="tt-free">FREE</span>
                {item.level && <span className="tt-level">{item.level}</span>}
              </>
            )}
            {item.section === "announcements" && (
              <span className="an-tag">ANNOUNCEMENT</span>
            )}
            {item.section === "marketplace" && (
              <span className="mk-badge">
                {item.status === "sold" ? "Sold" : "Available"}
              </span>
            )}
            {item.section === "food" && (
              <span className="mk-badge">
                {item.status === "sold_out" ? "Sold out" : "Available"}
              </span>
            )}
            {item.status === "resolved" && (
              <span className="lf-tag lf-tag-done">RESOLVED</span>
            )}
          </div>

          {item.section !== "announcements" && (
            <h1 className="pd-title">{item.title}</h1>
          )}

          {(item.section === "marketplace" || item.section === "food") && (
            <p className="pd-price">{formatNaira(item.price)}</p>
          )}

          {item.section === "announcements" && item.description && (
            <p className="an-text">{item.description}</p>
          )}

          <div className="pd-rows">
            {item.section === "marketplace" && (
              <>
                <Row
                  label="Condition"
                  value={item.item_condition ? CONDITION_LABEL[item.item_condition] : null}
                />
                <Row label="Location" value={item.location} />
              </>
            )}
            {item.section === "food" && (
              <>
                <Row
                  label="Fulfilment"
                  value={item.fulfilment ? FULFILMENT_LABEL[item.fulfilment] : null}
                />
                <Row label="Pickup/delivery location" value={item.location} />
              </>
            )}
            {item.section === "tutorials" && (
              <>
                <Row label="Level" value={item.level} />
                <Row label="Tutor" value={item.tutor_name} />
                <Row label="Organiser" value={item.organiser_name} />
                <Row label="Date" value={formatDate(item.event_date)} />
                <Row label="From" value={formatTime(item.start_time)} />
                <Row label="To" value={formatTime(item.end_time)} />
                <Row label="Venue" value={item.location} />
              </>
            )}
            {item.section === "lost_found" && (
              <>
                <Row label={isLost ? "Last seen" : "Found at"} value={item.location} />
                <Row label="Date" value={formatDate(item.event_date)} />
              </>
            )}
            {item.section === "announcements" && (
              <Row label="Event date" value={formatDate(item.event_date)} />
            )}
            <Row
              label="WhatsApp"
              value={item.contact_whatsapp ? `+${item.contact_whatsapp}` : null}
            />
            <Row label="Posted by" value={poster} />
            <Row label="Posted on" value={formatDate(item.created_at.slice(0, 10))} />
          </div>

          {item.section === "lost_found" && !isLost && (
            <div className="lf-proof" style={{ marginTop: 14 }}>
              Come with proof of ownership.
            </div>
          )}

          {item.file_url && (
            <a
              className="tt-file"
              href={item.file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 {item.file_name ?? "Attached file"}
            </a>
          )}

          {!isOwner && item.contact_whatsapp && item.status === "active" && (
            <a
              className="pd-whatsapp"
              href={whatsappLink(item)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {contactLabel(item)}
            </a>
          )}

          {!isOwner && item.status !== "active" && (
            <p className="pd-closed">This post is closed.</p>
          )}

          {item.section !== "announcements" && (
            <button
              className="pd-save"
              onClick={() => void handleSave()}
              disabled={busy}
            >
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
          )}

          {canManage && (
            <div className="pd-manage">
              {confirmDelete ? (
                <>
                  <span>Delete this post?</span>
                  <button
                    className="pd-danger"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                  >
                    {busy ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button className="pd-ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {statusAction && (
                    <button
                      className="pd-ghost"
                      disabled={busy}
                      onClick={() => void handleStatus(statusAction.next)}
                    >
                      {statusAction.label}
                    </button>
                  )}
                  <button className="pd-ghost" onClick={() => setEditing(true)}>
                    Edit post
                  </button>
                  <button className="pd-ghost" onClick={() => setConfirmDelete(true)}>
                    Delete post
                  </button>
                </>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}