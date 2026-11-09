"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  deleteListing,
  explainError,
  fetchListings,
  type Listing,
} from "@/lib/listings";
import { removeMediaByUrl } from "@/lib/uploads";
import EditPostForm from "./EditPostForm";
import TutorialsPostForm, { formatTime } from "./TutorialsPostForm";
import { formatDate } from "./LostFoundPostForm";

type Filter = "all" | "100L" | "200L";

function whatsappLink(item: Listing) {
  const text = `Hello, I saw your FutaHub post about the ${item.title} tutorial and I would like to join.`;
  return `https://wa.me/${item.contact_whatsapp}?text=${encodeURIComponent(text)}`;
}

export default function TutorialsFeed({
  onBack,
  startOnForm = false,
}: {
  onBack: () => void;
  startOnForm?: boolean;
}) {
  const [view, setView] = useState<"feed" | "form">(startOnForm ? "form" : "feed");
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
    const { data, error: loadError } = await fetchListings("tutorials", term);
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
      <TutorialsPostForm
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

  const visible = items.filter((item) => filter === "all" || item.level === filter);

  return (
    <section className="section-page">
      <button className="back-button" onClick={onBack}>
        <span>←</span> Back to home
      </button>

      <div className="tt-head">
        <h1>Tutorials Available</h1>
        <p>Free tutorials for 100L and 200L students.</p>
      </div>

      {banner && <div className="tt-success">{banner}</div>}

      <button
        className="primary-button"
        onClick={() => {
          setBanner("");
          setView("form");
        }}
      >
        + Post Tutorial
      </button>

      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by course code..."
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      <div className="tt-tabs">
        {(["all", "100L", "200L"] as Filter[]).map((option) => (
          <button
            key={option}
            className={filter === option ? "tt-tab tt-tab-on" : "tt-tab"}
            onClick={() => setFilter(option)}
          >
            {option === "all" ? "All" : option}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-panel">
          <div className="spinner" />
          <p>Loading tutorials...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : visible.length === 0 ? (
        <div className="empty-panel section-empty">
          <div className="empty-icon">📚</div>
          <h3>
            {search || filter !== "all"
              ? "No matching tutorials found"
              : "No tutorials available yet"}
          </h3>
          <p>
            {search || filter !== "all"
              ? "Try another search or filter."
              : "Be the first to post a free tutorial."}
          </p>
        </div>
      ) : (
        <div className="tt-list">
          {visible.map((item) => (
            <article className="tt-card" key={item.id} data-listing-id={item.id}>
              <div className="tt-tags">
                <span className="tt-free">FREE</span>
                {item.level && <span className="tt-level">{item.level}</span>}
              </div>

              <h3>{item.title}</h3>
              <p className="tt-line">Tutor: {item.tutor_name}</p>
              <p className="tt-line">Organiser: {item.organiser_name}</p>
              {item.event_date && (
                <p className="tt-line">Date: {formatDate(item.event_date)}</p>
              )}
              {item.start_time && (
                <p className="tt-line">From: {formatTime(item.start_time)}</p>
              )}
              {item.end_time && (
                <p className="tt-line">To: {formatTime(item.end_time)}</p>
              )}
              {item.location && <p className="tt-line">Venue: {item.location}</p>}

              {item.image_urls.length > 0 && (
                <div className="tt-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_urls[0]}
                    alt={item.title ?? "Tutorial photo"}
                    loading="lazy"
                  />
                  {item.image_urls.length > 1 && (
                    <span className="tt-count">+{item.image_urls.length - 1}</span>
                  )}
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

              <p className="tt-poster">
                Posted by {item.profiles?.display_name ?? "a student"}
              </p>

              {item.user_id !== userId && item.contact_whatsapp && (
                <a
                  className="tt-whatsapp"
                  href={whatsappLink(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact organiser on WhatsApp
                </a>
              )}

              {item.user_id === userId && (
                <div className="tt-owner">
                  {confirmId === item.id ? (
                    <>
                      <span>Delete this post?</span>
                      <button
                        className="tt-danger"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        {busyId === item.id ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        className="tt-ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="tt-ghost"
                        onClick={() => setEditing(item)}
                      >
                        Edit post
                      </button>
                      <button
                        className="tt-ghost"
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
        .tt-head h1 {
          margin: 12px 0 4px;
          font-size: 1.6rem;
        }
        .tt-head p {
          margin: 0 0 16px;
          opacity: 0.75;
        }
        .tt-success {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(57, 132, 255, 0.15);
          border: 1px solid #3984ff;
          font-weight: 600;
        }
        .tt-tabs {
          display: flex;
          gap: 8px;
          margin: 12px 0 4px;
        }
        .tt-tab {
          flex: 1;
          border-radius: 999px;
          padding: 8px 10px;
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
        }
        .tt-tab-on {
          background: #3984ff;
          border-color: #3984ff;
        }
        .tt-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .tt-card {
          background: #101827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }
        .tt-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        .tt-free,
        .tt-level {
          display: inline-block;
          border-radius: 999px;
          padding: 3px 12px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .tt-free {
          background: rgba(57, 132, 255, 0.18);
          color: #72aaff;
          border: 1px solid #3984ff;
        }
        .tt-level {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .tt-card h3 {
          margin: 0 0 8px;
          font-size: 1.15rem;
          overflow-wrap: anywhere;
        }
        .tt-line {
          margin: 0 0 4px;
          font-size: 0.9rem;
          opacity: 0.85;
          overflow-wrap: anywhere;
        }
        .tt-photo {
          position: relative;
          margin: 12px 0;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          background: #080d18;
        }
        .tt-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .tt-count {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.7);
          font-size: 0.8rem;
        }
        .tt-file {
          display: block;
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #080d18;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #72aaff;
          text-decoration: none;
          overflow-wrap: anywhere;
        }
        .tt-poster {
          margin: 10px 0 0;
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .tt-whatsapp {
          display: block;
          margin-top: 12px;
          text-align: center;
          padding: 12px;
          border-radius: 12px;
          background: #3984ff;
          color: #ffffff;
          font-weight: 700;
          text-decoration: none;
        }
        .tt-owner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.9rem;
        }
        .tt-ghost,
        .tt-danger {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #ffffff;
        }
        .tt-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .tt-danger {
          background: #c62828;
          border: 1px solid #c62828;
        }
        .tt-danger:disabled {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}