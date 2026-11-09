"use client";

import { useEffect, useState } from "react";
import { explainError, fetchSavedListings, type Listing } from "@/lib/listings";
import { formatNaira } from "./MarketplacePostForm";

const SECTION_LABEL: Record<Listing["section"], string> = {
  marketplace: "Student Marketplace",
  food: "Food & Snacks",
  tutorials: "Tutorials Available",
  lost_found: "Lost & Found",
  announcements: "Announcements",
};

export default function SavedPosts({ onExplore }: { onExplore: () => void }) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchSavedListings().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError(explainError(loadError));
      else setItems(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section-page">
      <div className="simple-page-heading">
        <span className="section-kicker">YOUR COLLECTION</span>
        <h1>Saved</h1>
        <p>Your bookmarked posts in one place.</p>
      </div>

      {loading ? (
        <div className="empty-panel">
          <div className="spinner" />
          <p>Loading saved posts...</p>
        </div>
      ) : error ? (
        <div className="notice-panel">{error}</div>
      ) : items.length === 0 ? (
        <div className="empty-panel">
          <div className="empty-icon">♡</div>
          <h3>No saved posts yet</h3>
          <p>Open a post and tap Save to keep it here.</p>
          <button className="primary-button" onClick={onExplore}>
            Explore FutaHub <span>→</span>
          </button>
        </div>
      ) : (
        <div className="sv-list">
          {items.map((item) => (
            <article className="sv-card" key={item.id} data-listing-id={item.id}>
              <div className="sv-tags">
                {item.section === "lost_found" ? (
                  <span
                    className={
                      item.lost_found_type === "lost"
                        ? "lf-tag lf-tag-lost"
                        : "lf-tag lf-tag-found"
                    }
                  >
                    {item.lost_found_type === "lost" ? "LOST" : "FOUND"}
                  </span>
                ) : (
                  <span className="sv-section">{SECTION_LABEL[item.section]}</span>
                )}
              </div>
              <h3>{item.title ?? "Announcement"}</h3>
              {(item.section === "marketplace" || item.section === "food") && (
                <p className="sv-price">{formatNaira(item.price)}</p>
              )}
              {item.location && <p className="sv-meta">{item.location}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}