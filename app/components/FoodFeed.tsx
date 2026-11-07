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
import FoodPostForm, { FULFILMENT_LABEL } from "./FoodPostForm";
import { formatNaira } from "./MarketplacePostForm";

export default function FoodFeed({
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
    const { data, error: loadError } = await fetchListings("food", term);
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

  async function toggleSoldOut(item: Listing) {
    const next = item.status === "sold_out" ? "active" : "sold_out";
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

  if (view === "form") {
    return (
      <FoodPostForm
        onCancel={() => setView("feed")}
        onPosted={() => {
          setView("feed");
          setBanner("Your post has been created successfully!");
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

      <div className="fd-head">
        <h1>Food & Snacks</h1>
        <p>Discover food, snacks and refreshments around campus.</p>
      </div>

      {banner && <div className="fd-success">{banner}</div>}

      <button
        className="primary-button"
        onClick={() => {
          setBanner("");
          setView("form");
        }}
      >
        + Post Food
      </button>

      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search food..."
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
          <p>Loading food posts...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-panel section-empty">
          <div className="empty-icon">🍔</div>
          <h3>{search ? "No matching food found" : "No food posts yet"}</h3>
          <p>
            {search
              ? "Try another search term."
              : "Be the first to post food for sale."}
          </p>
        </div>
      ) : (
        <div className="fd-list">
          {items.map((item) => (
            <article className="fd-card" key={item.id}>
              {item.image_urls.length > 0 && (
                <div className="fd-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_urls[0]}
                    alt={item.title ?? "Food photo"}
                    loading="lazy"
                  />
                  {item.image_urls.length > 1 && (
                    <span className="fd-count">+{item.image_urls.length - 1}</span>
                  )}
                </div>
              )}
              <h3>{item.title}</h3>
              <p className="fd-price">{formatNaira(item.price)}</p>
              <div className="fd-meta">
                <span className="fd-badge">
                  {item.status === "sold_out" ? "Sold out" : "Available"}
                </span>
                {item.fulfilment && (
                  <span className="fd-badge">
                    {FULFILMENT_LABEL[item.fulfilment]}
                  </span>
                )}
                {item.video_url && <span className="fd-badge">🎥 Video</span>}
                {item.location && <span>{item.location}</span>}
              </div>
              <p className="fd-seller">
                Posted by {item.profiles?.display_name ?? "a student"}
              </p>

              {item.user_id === userId && (
                <div className="fd-owner">
                  {confirmId === item.id ? (
                    <>
                      <span>Delete this post?</span>
                      <button
                        className="fd-danger"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        {busyId === item.id ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        className="fd-ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="fd-ghost"
                        disabled={busyId === item.id}
                        onClick={() => void toggleSoldOut(item)}
                      >
                        {item.status === "sold_out"
                          ? "Mark available"
                          : "Mark sold out"}
                      </button>
                      <button
                        className="fd-ghost"
                        onClick={() => setEditing(item)}
                      >
                        Edit post
                      </button>
                      <button
                        className="fd-ghost"
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
        .fd-head h1 {
          margin: 12px 0 4px;
          font-size: 1.6rem;
        }
        .fd-head p {
          margin: 0 0 16px;
          opacity: 0.75;
        }
        .fd-success {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(57, 132, 255, 0.15);
          border: 1px solid #3984ff;
          font-weight: 600;
        }
        .fd-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .fd-card {
          background: #101827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }
        .fd-photo {
          position: relative;
          margin-bottom: 12px;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          background: #080d18;
        }
        .fd-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .fd-count {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.7);
          font-size: 0.8rem;
        }
        .fd-card h3 {
          margin: 0 0 6px;
          font-size: 1.05rem;
          overflow-wrap: anywhere;
        }
        .fd-price {
          margin: 0 0 8px;
          color: #72aaff;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .fd-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.85rem;
          opacity: 0.9;
        }
        .fd-badge {
          border-radius: 999px;
          padding: 2px 10px;
          background: rgba(57, 132, 255, 0.15);
          color: #72aaff;
        }
        .fd-seller {
          margin: 10px 0 0;
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .fd-owner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.9rem;
        }
        .fd-ghost,
        .fd-danger {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #ffffff;
        }
        .fd-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .fd-danger {
          background: #c62828;
          border: 1px solid #c62828;
        }
        .fd-danger:disabled,
        .fd-ghost:disabled {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}