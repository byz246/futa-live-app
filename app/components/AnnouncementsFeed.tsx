"use client";

import { useCallback, useEffect, useState } from "react";
import { checkIsAdmin } from "@/lib/admin";
import {
  deleteListing,
  explainError,
  fetchListings,
  updateListing,
  type Listing,
} from "@/lib/listings";
import { removeMediaByUrl } from "@/lib/uploads";
import AnnouncementForm from "./AnnouncementForm";
import EditPostForm from "./EditPostForm";
import { formatDate } from "./LostFoundPostForm";

export default function AnnouncementsFeed({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"feed" | "form">("feed");
  const [banner, setBanner] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);

  useEffect(() => {
    void checkIsAdmin().then(setIsAdmin);
  }, []);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await fetchListings("announcements", term);
    if (loadError) {
      setError(explainError(loadError));
      setItems([]);
    } else {
      setItems(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  async function handleDelete(item: Listing) {
    setBusyId(item.id);
    const { error: deleteError } = await deleteListing(item.id);
    if (deleteError) {
      setBanner(explainError(deleteError));
    } else {
      await removeMediaByUrl([...item.image_urls, item.file_url]);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setBanner("Your post has been deleted.");
    }
    setBusyId(null);
    setConfirmId(null);
  }

  async function togglePin(item: Listing) {
    setBusyId(item.id);
    const { error: pinError } = await updateListing(item.id, {
      is_pinned: !item.is_pinned,
    });
    if (pinError) {
      setBanner(explainError(pinError));
    } else {
      await load(search);
    }
    setBusyId(null);
  }

  if (editing) {
    return (
      <EditPostForm
        item={editing}
        onCancel={() => setEditing(null)}
        onSaved={(updated) => {
          setItems((current) =>
            current.map((entry) => (entry.id === updated.id ? updated : entry))
          );
          setEditing(null);
          setBanner("Your post has been updated.");
        }}
      />
    );
  }

  if (view === "form") {
    return (
      <AnnouncementForm
        onCancel={() => setView("feed")}
        onPosted={() => {
          setView("feed");
          setBanner("Your announcement post has been created successfully!");
          setSearch("");
          void load("");
        }}
      />
    );
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onBack}>
        <span>←</span> Back to home
      </button>

      <div className="an-head">
        <h1>Announcements</h1>
        <p>Official updates from your university.</p>
      </div>

      {banner && <div className="an-success">{banner}</div>}

      {isAdmin && (
        <button
          className="primary-button"
          onClick={() => {
            setBanner("");
            setView("form");
          }}
        >
          + Create Announcement
        </button>
      )}

      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search announcements..."
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-panel">
          <div className="spinner" />
          <p>Loading announcements...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-panel section-empty">
          <div className="empty-icon">📢</div>
          <h3>{search ? "No matching announcements found" : "No announcements yet"}</h3>
          <p>
            {search
              ? "Try another search term."
              : "New updates will appear here."}
          </p>
        </div>
      ) : (
        <div className="an-list">
          {items.map((item) => (
            <article className="an-card" key={item.id}>
              <div className="an-tags">
                <span className="an-tag">ANNOUNCEMENT</span>
                {item.is_pinned && <span className="an-pin">📌 Pinned</span>}
              </div>

              {item.description && <p className="an-text">{item.description}</p>}

              {item.event_date && (
                <p className="an-line">Event date: {formatDate(item.event_date)}</p>
              )}

              {item.image_urls.length > 0 && (
                <div className="an-photos">
                  {item.image_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Announcement" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              {item.file_url && (
                <a
                  className="an-file"
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📎 {item.file_name ?? "Attached file"}
                </a>
              )}

              <p className="an-date">Posted {formatDate(item.created_at.slice(0, 10))}</p>

              {isAdmin && (
                <div className="an-owner">
                  {confirmId === item.id ? (
                    <>
                      <span>Delete this post?</span>
                      <button
                        className="an-danger"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        {busyId === item.id ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        className="an-ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="an-ghost"
                        disabled={busyId === item.id}
                        onClick={() => void togglePin(item)}
                      >
                        {item.is_pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="an-ghost"
                        onClick={() => setEditing(item)}
                      >
                        Edit post
                      </button>
                      <button
                        className="an-ghost"
                        onClick={() => setConfirmId(item.id)}
                      >
                        Delete post
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <style jsx>{`
        .an-head h1 {
          margin: 12px 0 4px;
          font-size: 1.6rem;
        }
        .an-head p {
          margin: 0 0 16px;
          opacity: 0.75;
        }
        .an-success {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(57, 132, 255, 0.15);
          border: 1px solid #3984ff;
          font-weight: 600;
        }
        .an-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .an-card {
          background: #101827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }
        .an-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .an-tag {
          display: inline-block;
          border-radius: 999px;
          padding: 3px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          background: rgba(57, 132, 255, 0.18);
          color: #72aaff;
          border: 1px solid #3984ff;
        }
        .an-pin {
          font-size: 0.85rem;
          opacity: 0.85;
        }
        .an-text {
          margin: 8px 0 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          line-height: 1.5;
        }
        .an-line {
          margin: 10px 0 0;
          font-size: 0.9rem;
          opacity: 0.85;
        }
        .an-photos {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }
        .an-photos img {
          width: 100%;
          height: auto;
          border-radius: 12px;
          display: block;
        }
        .an-file {
          display: block;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #080d18;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #72aaff;
          text-decoration: none;
          overflow-wrap: anywhere;
        }
        .an-date {
          margin: 12px 0 0;
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .an-owner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.9rem;
        }
        .an-ghost,
        .an-danger {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #ffffff;
        }
        .an-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .an-danger {
          background: #c62828;
          border: 1px solid #c62828;
        }
        .an-danger:disabled,
        .an-ghost:disabled {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}