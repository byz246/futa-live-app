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
import MarketplacePostForm, {
  CONDITION_LABEL,
  formatNaira,
} from "./MarketplacePostForm";

export default function MarketplaceFeed({
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await fetchListings("marketplace", term);
    if (loadError) {
      setError(explainError(loadError));
      setItems([]);
    } else {
      setItems(data);
    }
    setLoading(false);
  }, []);

  // Wait a moment after typing stops, then search.
  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  // Hide messages after a few seconds.
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  async function handleDelete(item: Listing) {
    setDeletingId(item.id);
    const { error: deleteError } = await deleteListing(item.id);
    if (deleteError) {
      setBanner(explainError(deleteError));
    } else {
      await removeMediaByUrl([...item.image_urls, item.video_url]);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setBanner("Your post has been deleted.");
    }
    setDeletingId(null);
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
      <MarketplacePostForm
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

      <div className="mk-head">
        <h1>Student Marketplace</h1>
        <p>Buy and sell items with fellow FUTA students.</p>
      </div>

      {banner && <div className="mk-success">{banner}</div>}

      <button
        className="primary-button"
        onClick={() => {
          setBanner("");
          setView("form");
        }}
      >
        + Post a Product
      </button>

      <div className="search-box">
        <span>⌕</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products..."
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
          <p>Loading products...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-panel section-empty">
          <div className="empty-icon">🛍️</div>
          <h3>{search ? "No matching products found" : "No products yet"}</h3>
          <p>
            {search
              ? "Try another search term."
              : "Be the first to list something for sale."}
          </p>
        </div>
      ) : (
        <div className="mk-list">
          {items.map((item) => (
            <article className="mk-card" key={item.id}>
              {item.image_urls.length > 0 && (
                <div className="mk-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_urls[0]}
                    alt={item.title ?? "Product photo"}
                    loading="lazy"
                  />
                  {item.image_urls.length > 1 && (
                    <span className="mk-count">+{item.image_urls.length - 1}</span>
                  )}
                </div>
              )}
              <h3>{item.title}</h3>
              <p className="mk-price">{formatNaira(item.price)}</p>
              <div className="mk-meta">
                {item.item_condition && (
                  <span className="mk-badge">
                    {CONDITION_LABEL[item.item_condition]}
                  </span>
                )}
                {item.status === "sold" && (
                  <span className="mk-badge mk-sold">Sold</span>
                )}
                {item.video_url && <span className="mk-badge">🎥 Video</span>}
                {item.location && <span>{item.location}</span>}
              </div>
              <p className="mk-seller">
                Posted by {item.profiles?.display_name ?? "a student"}
              </p>

              {item.user_id === userId && (
                <div className="mk-owner">
                  {confirmId === item.id ? (
                    <>
                      <span>Delete this post?</span>
                      <button
                        className="mk-danger"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        {deletingId === item.id ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        className="mk-ghost"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="mk-ghost"
                        onClick={() => setEditing(item)}
                      >
                        Edit post
                      </button>
                      <button
                        className="mk-ghost"
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
        .mk-head h1 {
          margin: 12px 0 4px;
          font-size: 1.6rem;
        }
        .mk-head p {
          margin: 0 0 16px;
          opacity: 0.75;
        }
        .mk-success {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(57, 132, 255, 0.15);
          border: 1px solid #3984ff;
          font-weight: 600;
        }
        .mk-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .mk-card {
          background: #101827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }
        .mk-photo {
          position: relative;
          margin-bottom: 12px;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          background: #080d18;
        }
        .mk-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .mk-count {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.7);
          font-size: 0.8rem;
        }
        .mk-card h3 {
          margin: 0 0 6px;
          font-size: 1.05rem;
          overflow-wrap: anywhere;
        }
        .mk-price {
          margin: 0 0 8px;
          color: #72aaff;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .mk-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.85rem;
          opacity: 0.85;
        }
        .mk-badge {
          border-radius: 999px;
          padding: 2px 10px;
          background: rgba(57, 132, 255, 0.15);
          color: #72aaff;
        }
        .mk-sold {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        .mk-seller {
          margin: 10px 0 0;
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .mk-owner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.9rem;
        }
        .mk-ghost,
        .mk-danger {
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          color: #ffffff;
        }
        .mk-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .mk-danger {
          background: #c62828;
          border: 1px solid #c62828;
        }
        .mk-danger:disabled {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}