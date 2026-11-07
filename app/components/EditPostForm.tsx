"use client";

import { useState } from "react";
import {
  explainError,
  updateListing,
  type Listing,
  type ListingChanges,
} from "@/lib/listings";
import { normalizeWhatsapp } from "./MarketplacePostForm";

type Level = "100L" | "200L";
type Condition = "new" | "like_new" | "used";
type Fulfilment = "pickup" | "delivery" | "both";

const HEADINGS: Record<Listing["section"], string> = {
  marketplace: "Edit Product Post",
  food: "Edit Food Post",
  tutorials: "Edit Tutorial Post",
  lost_found: "Edit Lost and Found Post",
  announcements: "Edit Announcement Post",
};

function normalizeCourse(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^([A-Z]{2,5})(\d{3}[A-Z]?)$/);
  return match ? `${match[1]} ${match[2]}` : null;
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function EditPostForm({
  item,
  onCancel,
  onSaved,
}: {
  item: Listing;
  onCancel: () => void;
  onSaved: (updated: Listing) => void;
}) {
  const section = item.section;
  const isLost = item.lost_found_type === "lost";

  const [title, setTitle] = useState(item.title ?? "");
  const [price, setPrice] = useState(item.price !== null ? String(item.price) : "");
  const [condition, setCondition] = useState(item.item_condition ?? "");
  const [location, setLocation] = useState(item.location ?? "");
  const [whatsapp, setWhatsapp] = useState(item.contact_whatsapp ?? "");
  const [fulfilment, setFulfilment] = useState(item.fulfilment ?? "");
  const [level, setLevel] = useState(item.level ?? "");
  const [tutor, setTutor] = useState(item.tutor_name ?? "");
  const [organiser, setOrganiser] = useState(item.organiser_name ?? "");
  const [date, setDate] = useState(item.event_date ?? "");
  const [start, setStart] = useState((item.start_time ?? "").slice(0, 5));
  const [end, setEnd] = useState((item.end_time ?? "").slice(0, 5));
  const [notice, setNotice] = useState(item.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function checkForm(): string {
    if (section === "announcements") {
      if (!notice.trim() && item.image_urls.length === 0 && !item.file_url) {
        return "An announcement needs notice details, a photo or a file.";
      }
      return "";
    }
    if (section === "tutorials") {
      if (!normalizeCourse(title)) {
        return "Please enter a valid course code, for example MTS 201.";
      }
      if (!level) return "Please choose 100L or 200L.";
      if (!tutor.trim()) return "Please enter the tutor name.";
      if (!organiser.trim()) return "Please enter the sponsor or organiser name.";
      if (start && end && end <= start) {
        return "The end time must be after the start time.";
      }
    } else {
      if (!title.trim()) return "Please enter the name.";
      if (title.trim().length > 120) return "The name is too long.";
    }
    if (section === "marketplace" || section === "food") {
      const amount = Number(price);
      if (!price || !Number.isFinite(amount) || amount <= 0) {
        return "Please enter a valid price in naira.";
      }
      if (amount > 100000000) return "That price is too high.";
    }
    if (section === "marketplace" && !condition) return "Please choose the condition.";
    if (section === "food" && !fulfilment) return "Please choose a fulfilment option.";
    if (
      (section === "marketplace" || section === "food" || section === "lost_found") &&
      !location.trim()
    ) {
      return "Please enter the location.";
    }
    if (section === "lost_found") {
      if (!date) return "Please choose the date.";
      if (date > todayString()) return "The date cannot be in the future.";
    }
    if (!normalizeWhatsapp(whatsapp)) {
      return "Please enter a valid WhatsApp number, for example 08012345678.";
    }
    return "";
  }

  async function save() {
    if (saving) return;
    const problem = checkForm();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");

    const phone = normalizeWhatsapp(whatsapp) ?? undefined;
    let changes: ListingChanges;

    if (section === "announcements") {
      changes = { description: notice.trim(), event_date: date };
    } else if (section === "tutorials") {
      changes = {
        title: normalizeCourse(title) ?? title.trim(),
        level: level as Level,
        tutor_name: tutor.trim(),
        organiser_name: organiser.trim(),
        event_date: date,
        start_time: start,
        end_time: end,
        location: location.trim(),
        contact_whatsapp: phone,
      };
    } else if (section === "lost_found") {
      changes = {
        title: title.trim(),
        location: location.trim(),
        event_date: date,
        contact_whatsapp: phone,
      };
    } else if (section === "food") {
      changes = {
        title: title.trim(),
        price: Number(price),
        location: location.trim(),
        fulfilment: fulfilment as Fulfilment,
        contact_whatsapp: phone,
      };
    } else {
      changes = {
        title: title.trim(),
        price: Number(price),
        item_condition: condition as Condition,
        location: location.trim(),
        contact_whatsapp: phone,
      };
    }

    const { data, error: saveError } = await updateListing(item.id, changes);
    setSaving(false);
    if (saveError || !data) {
      setError(explainError(saveError) || "Could not save your changes. Please try again.");
      return;
    }
    onSaved(data);
  }

  return (
    <section className="section-page">
      <button className="back-button" onClick={onCancel}>
        <span>←</span> Cancel
      </button>

      <div className="pf-head">
        {section === "lost_found" && (
          <span className={`lf-tag ${isLost ? "lf-tag-lost" : "lf-tag-found"}`}>
            {isLost ? "LOST" : "FOUND"}
          </span>
        )}
        {section === "tutorials" && <span className="tf-free">FREE - ALWAYS</span>}
        <h1>{HEADINGS[section]}</h1>
        <p>Fields marked * are required.</p>
      </div>

      {section === "announcements" && (
        <div className="pf-field">
          <label htmlFor="ep-notice">Notice details</label>
          <textarea
            id="ep-notice"
            className="an-textarea"
            value={notice}
            onChange={(event) => setNotice(event.target.value)}
            maxLength={2000}
          />
        </div>
      )}

      {section !== "announcements" && (
        <div className="pf-field">
          <label htmlFor="ep-title">
            {section === "tutorials"
              ? "Course code *"
              : section === "marketplace"
                ? "Product name *"
                : section === "food"
                  ? "Food name *"
                  : "Item name *"}
          </label>
          <input
            id="ep-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={section === "tutorials" ? 12 : 120}
          />
        </div>
      )}

      {(section === "marketplace" || section === "food") && (
        <div className="pf-field">
          <label htmlFor="ep-price">Price (₦) *</label>
          <input
            id="ep-price"
            value={price}
            inputMode="numeric"
            onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
      )}

      {section === "marketplace" && (
        <div className="pf-field">
          <label htmlFor="ep-condition">Condition *</label>
          <select
            id="ep-condition"
            value={condition}
            onChange={(event) => setCondition(event.target.value as Condition)}
          >
            <option value="">Select condition</option>
            <option value="new">New</option>
            <option value="like_new">Like new</option>
            <option value="used">Used</option>
          </select>
        </div>
      )}

      {section === "food" && (
        <div className="pf-field">
          <label htmlFor="ep-fulfilment">Fulfilment option *</label>
          <select
            id="ep-fulfilment"
            value={fulfilment}
            onChange={(event) => setFulfilment(event.target.value as Fulfilment)}
          >
            <option value="">Select an option</option>
            <option value="pickup">Pickup only</option>
            <option value="delivery">Delivery available</option>
            <option value="both">Both</option>
          </select>
        </div>
      )}

      {section === "tutorials" && (
        <>
          <div className="pf-field">
            <label htmlFor="ep-level">Level *</label>
            <select
              id="ep-level"
              value={level}
              onChange={(event) => setLevel(event.target.value as Level)}
            >
              <option value="">Select level</option>
              <option value="100L">100L</option>
              <option value="200L">200L</option>
            </select>
          </div>
          <div className="pf-field">
            <label htmlFor="ep-tutor">Tutor name *</label>
            <input
              id="ep-tutor"
              value={tutor}
              onChange={(event) => setTutor(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="pf-field">
            <label htmlFor="ep-organiser">Sponsor or organiser name *</label>
            <input
              id="ep-organiser"
              value={organiser}
              onChange={(event) => setOrganiser(event.target.value)}
              maxLength={120}
            />
          </div>
        </>
      )}

      {section !== "announcements" && (
        <div className="pf-field">
          <label htmlFor="ep-location">
            {section === "tutorials"
              ? "Venue"
              : section === "lost_found"
                ? isLost
                  ? "Last seen location *"
                  : "Where was it found? *"
                : section === "food"
                  ? "Pickup/delivery location *"
                  : "Location *"}
          </label>
          <input
            id="ep-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={160}
          />
        </div>
      )}

      {(section === "lost_found" || section === "tutorials" || section === "announcements") && (
        <div className="pf-field">
          <label htmlFor="ep-date">
            {section === "lost_found"
              ? "Date *"
              : section === "tutorials"
                ? "Tutorial date"
                : "Relevant event date"}
          </label>
          <input
            id="ep-date"
            type="date"
            value={date}
            max={section === "lost_found" ? todayString() : undefined}
            onChange={(event) => setDate(event.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>
      )}

      {section === "tutorials" && (
        <div className="tf-times">
          <div className="pf-field">
            <label htmlFor="ep-from">From (start time)</label>
            <input
              id="ep-from"
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="pf-field">
            <label htmlFor="ep-to">To (end time)</label>
            <input
              id="ep-to"
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>
      )}

      {section !== "announcements" && (
        <div className="pf-field">
          <label htmlFor="ep-whatsapp">
            {section === "tutorials" ? "Organiser WhatsApp number *" : "WhatsApp number *"}
          </label>
          <input
            id="ep-whatsapp"
            value={whatsapp}
            inputMode="tel"
            onChange={(event) => setWhatsapp(event.target.value)}
          />
        </div>
      )}

      <p className="mp-hint">
        Photos and files stay as they are. To change them, delete this post and
        post again.
      </p>

      {error && <div className="notice-panel">{error}</div>}

      <div className="pf-actions">
        <button className="pf-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  );
}