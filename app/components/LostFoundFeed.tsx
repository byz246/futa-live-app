"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  deleteListing,
  explainError,
  fetchListings,
  setListingStatus,
  type Listing,
} from "@/lib/listings";
import { removeMediaByUrl } from "@/lib/uploads";
import EditPostForm from "./EditPostForm";
import LostFoundPostForm, {
  formatDate,
  type ReportKind,
} from "./LostFoundPostForm";

type Filter = "all" | "lost" | "found";

function whatsappLink(item: Listing) {
  const text =
    item.lost_found_type === "found"
      ? `Hello, I saw your FutaHub post about the found item: ${item.title}. I think it is mine and I can show proof of ownership.`
      : `Hello, I saw your FutaHub post about the lost item: ${item.title}. I may have found it.`;
  return `https://wa.me/${item.contact_whatsapp}?text=${encodeURIComponent(text)}`;
}

export default function LostFoundFeed({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"feed" | ReportKind>("feed");
  const [banner, setBanner] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await fetchListings("lost_found", term);
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
      await removeMediaByUrl([...item.image_urls, item.video_url]);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setBanner("Your post has been deleted.");
    }
    setBusyId(null);
    setConfirmId(null);
  }

  async function toggleResolved(item: Listing) {
    const next = item.status === "resolved" ? "active" : "resolved";
    setBusyId(item.id);
    const { data, error: updateError } = await setListingStatus(item.id, next);
    if (updateError || !data) {
      setBanner(explainError(updateError) || "Could not update this post.");
    } else {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: next } : entry
        )
      );
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

  if (view === "lost" || view === "found") {
    return (
      <LostFoundPostForm
        kind={view}
        onCancel={() => setView("feed")}
        onPosted={() => {
          setView("feed");
          setBanner("Your post has been created successfully!");
          setSearch("");
          setFilter("all");
          void load("");
        }}
      />
    );
  }

  const visible = items.filter(
    (item) => filter === "all" || item.lost_found_type === filter
  );

  return (
    <section className="section-page">
      <button className="back-button" onClick={onBack}>
        <span>←</span> Back to home
      </button>

      <div className="lf-head">
        <h1>Lost & Found</h1>
        <p>Find missing items or help return found belongings.</p>
      </div>

      {banner && <div className="lf-success">{banner}</div>}

      <div className="lf-choose">
        <button
          className="lf-choice lf-choice-lost"
          onClick={() => {
            setBanner("");
            setView("lost");
          }}
        >
          I lost an item
        </button>
        <button
          className="lf-choice lf-choice-found"
          onClick={() => {
            setBanner("");
            setView("found");
          }}
        >
          I found an item
        </button>
      </div>

      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search lost or found items..."
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      <div className="lf-tabs">
        {(["all", "lost", "found"] as Filter[]).map((option) => (
          <button
            key={option}
            className={filter === option ? "lf-tab lf-tab-on" : "lf-tab"}
            onClick={() => setFilter(option)}
          >
            {option === "all" ? "All" : option === "lost" ? "Lost" : "Found"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-panel">
          <div className="spinner" />
          <p>Loading reports...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : visible.length === 0 ? (
        <div className="empty-panel section-empty">
          <div className="empty-icon">🔎</div>
          <h3>
            {search || filter !== "all"
              ? "No matching reports found"
              : "No lost or found items yet"}
          </h3>
          <p>
            {search || filter !== "all"
              ? "Try another search or filter."
              : "Reports from students will appear here."}
          </p>
        </div>
      ) : (
        <div className="lf-list">
          {visible.map((item) => {
            const isLost = item.lost_found_type === "lost";
            const isOwner = item.user_id === userId;
            return (
               <article className="lf-card" key={item.id} data-listing-id={item.id}>
                <div className="lf-tags">
                  <span className={isLost ? "lf-tag lf-tag-lost" : "lf-tag lf-tag-found"}>
                    {isLost ? "LOST" : "FOUND"}
                  </span>
                  {item.status === "resolved" && (
                    <span className="lf-tag lf-tag-done">RESOLVED</span>
                  )}
                </div>

                {item.image_urls.length > 0 && (
                  <div className="lf-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_urls[0]}
                      alt={item.title ?? "Item photo"}
                      loading="lazy"
                    />
                    {item.image_urls.length > 1 && (
                      <span className="lf-count">+{item.image_urls.length - 1}</span>
                    )}
                  </div>
                )}

                <h3>{item.title}</h3>
                <p className="lf-line">
                  {isLost ? "Last seen" : "Found at"}: {item.location}
                </p>
                <p className="lf-line">Date: {formatDate(item.event_date)}</p>
                {!isLost && (
                  <p className="lf-proof-note">Come with proof of ownership.</p>
                )}
                <p className="lf-poster">
                  Posted by {item.profiles?.display_name ?? "a student"}
                </p>

                {!isOwner && item.contact_whatsapp && item.status !== "resolved" && (
                  <a
                    className="lf-whatsapp"
                    href={whatsappLink(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact on WhatsApp
                  </a>
                )}

                {isOwner && (
                  <div className="lf-owner">
                    {confirmId === item.id ? (
                      <>
                        <span>Delete this post?</span>
                        <button
                          className="lf-danger"
                          disabled={busyId === item.id}
                          onClick={() => void handleDelete(item)}
                        >
                          {busyId === item.id ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          className="lf-ghost"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="lf-ghost"
                          disabled={busyId === item.id}
                          onClick={() => void toggleResolved(item)}
                        >
                          {item.status === "resolved"
                            ? "Reopen"
                            : "Mark as resolved"}
                        </button>
                        <button
                          className="lf-ghost"
                          onClick={() => setEditing(item)}
                        >
                          Edit post
                        </button>
                        <button
                          className="lf-ghost"
                          onClick={() => setConfirmId(item.id)}
                        >
                          Delete post
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .lf-head h1 {
          margin: 12px 0 4px;
          font-size: 1.6rem;
        }
        .lf-head p {
          margin: 0 0 16px;
          opacity: 0.75;
        }
        .lf-success {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(57, 132, 255, 0.15);
          border: 1px solid #3984ff;
          font-weight: 600;
        }
        .lf-choose {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .lf-choice {
          border-radius: 14px;
          padding: 16px 8px;
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          min-width: 0;
        }
        .lf-choice-lost {
          background: #c62828;
          border: 1px solid #e53935;
        }
        .lf-choice-found {
          background: #1f8a3b;
          border: 1px solid #2ea043;
        }
        .lf-tabs {
          display: flex;
          gap: 8px;
          margin: 12px 0 4px;
        }
        .lf-tab {
          flex: 1;
          border-radius: 999px;
          padding: 8px 10px;
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
        }
        .lf-tab-on {
          background: #3984ff;
          border-color: #3984ff;
        }
        .lf-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .lf-card {
          background: #101827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }
        .lf-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        .lf-tag {
          display: inline-block;
          border-radius: 999px;
          padding: 3px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .lf-tag-lost {
          background: rgba(229, 57, 53, 0.18);
          color: #ff6b66;
          border: 1px solid #e53935;
        }
        .lf-tag-found {
          background: rgba(46, 160, 67, 0.18);
          color: #4cd964;
          border: 1px solid #2ea043;
        }
        .lf-tag-done {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .lf-photo {
          position: relative;
          margin-bottom: 12px;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          background: #080d18;
        }
        .lf-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .lf-count {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.7);
          font-size: 0.8rem;
        }
        .lf-card h3 {
          margin: 0 0 6px;
          font-size: 1.05rem;
          overflow-wrap: anywhere;
        }
        .lf-line {
          margin: 0 0 4px;
          font-size: 0.9rem;
          opacity: 0.85;
          overflow-wrap: anywhere;
        }
        .lf-proof-note {
          margin: 8px 0 0;
          font-size: 0.85rem;
          color: #4cd964;
        }
        .lf-poster {
          margin: 10px 0 0;
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .lf-whatsapp {
          display: block;
          margin-top: 12px;
          text-align: center;
          padding: 12px;
          border-radius: 12px;
          background: #1f8a3b;
          color: #ffffff;
          font-weight: 700;
          text-decoration: none;
        }
        .lf-owner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.9rem;
        }
        .lf-ghost,
        .lf-danger {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #ffffff;
        }
        .lf-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .lf-danger {
          background: #c62828;
          border: 1px solid #c62828;
        }
        .lf-danger:disabled,
        .lf-ghost:disabled {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}