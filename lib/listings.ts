import { supabase } from "@/lib/supabase";

export type Section =
  | "announcements"
  | "marketplace"
  | "food"
  | "tutorials"
  | "lost_found";

export type Listing = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  section: Section;
  lost_found_type: "lost" | "found" | null;
  title: string | null;
  description: string | null;
  price: number | null;
  contact_whatsapp: string | null;
  location: string | null;
  image_urls: string[];
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  status: "active" | "sold" | "sold_out" | "resolved";
  item_condition: "new" | "like_new" | "used" | null;
  fulfilment: "pickup" | "delivery" | "both" | null;
  level: "100L" | "200L" | null;
  tutor_name: string | null;
  organiser_name: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_pinned: boolean;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
};

export type NewListing = {
  section: Section;
  lost_found_type?: "lost" | "found";
  title?: string;
  description?: string;
  price?: number;
  contact_whatsapp?: string;
  location?: string;
  image_urls?: string[];
  video_url?: string;
  file_url?: string;
  file_name?: string;
  item_condition?: "new" | "like_new" | "used";
  fulfilment?: "pickup" | "delivery" | "both";
  level?: "100L" | "200L";
  tutor_name?: string;
  organiser_name?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  is_pinned?: boolean;
};

export type ListingChanges = Partial<
  Omit<NewListing, "section" | "lost_found_type">
> & { status?: Listing["status"] };

const LISTING_SELECT = "*, profiles(display_name, avatar_url)";

// Shows only the first name, for example "Ayatullah".
function shortName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function tidy(listing: Listing): Listing {
  if (!listing.profiles) return listing;
  return {
    ...listing,
    profiles: {
      ...listing.profiles,
      display_name: shortName(listing.profiles.display_name),
    },
  };
}

// Turns database errors into short, plain messages for students.
export function explainError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return "";
  if (e.code === "42501") return "You are not allowed to do that.";
  if (e.code === "23514") return "Some details are missing or not valid. Please check the form.";
  if (e.code === "23505") return "That has already been done.";
  return e.message || "Something went wrong. Please try again.";
}

// Leaves out empty fields when creating a post.
function dropEmpty(input: object) {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined && v !== "")
  );
}

// Turns empty fields into null when editing, so a blank clears the value.
function emptyToNull(input: object) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === "" ? null : v])
  );
}

export async function fetchListings(section: Section, search = "") {
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("section", section)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const term = search.replace(/[%,()*]/g, " ").trim();
  if (term) {
    query = query.or(
      `title.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  return { data: ((data ?? []) as unknown as Listing[]).map(tidy), error };
}

export async function fetchListing(id: number) {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .single();
  const listing = data as unknown as Listing | null;
  return { data: listing ? tidy(listing) : null, error };
}

export async function fetchMyListings(userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: ((data ?? []) as unknown as Listing[]).map(tidy), error };
}

export async function createListing(input: NewListing) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { data: null, error: new Error("Please log in first.") };
  }
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...dropEmpty(input), user_id: auth.user.id })
    .select(LISTING_SELECT)
    .single();
  const listing = data as unknown as Listing | null;
  return { data: listing ? tidy(listing) : null, error };
}

export async function updateListing(id: number, changes: ListingChanges) {
  const { data, error } = await supabase
    .from("listings")
    .update(emptyToNull(changes))
    .eq("id", id)
    .select(LISTING_SELECT)
    .single();
  const listing = data as unknown as Listing | null;
  return { data: listing ? tidy(listing) : null, error };
}

export function setListingStatus(id: number, status: Listing["status"]) {
  return updateListing(id, { status });
}

export async function deleteListing(id: number) {
  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .select("id");
  if (!error && (!data || data.length === 0)) {
    return { error: new Error("This post could not be deleted.") };
  }
  return { error };
}

export async function fetchSavedIds() {
  const { data, error } = await supabase.from("saved_posts").select("listing_id");
  const ids = new Set<number>(
    (data ?? []).map((row: { listing_id: number }) => row.listing_id)
  );
  return { ids, error };
}

export async function fetchSavedListings() {
  const { data, error } = await supabase
    .from("saved_posts")
    .select(`listing_id, created_at, listings(${LISTING_SELECT})`)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { listings: Listing | null }[];
  return {
    data: rows
      .map((row) => row.listings)
      .filter((l): l is Listing => l !== null)
      .map(tidy),
    error,
  };
}

export async function toggleSaved(listingId: number, save: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Please log in first.") };

  if (save) {
    const { error } = await supabase
      .from("saved_posts")
      .insert({ user_id: auth.user.id, listing_id: listingId });
    if (error && error.code !== "23505") return { error };
    return { error: null };
  }
  const { error } = await supabase
    .from("saved_posts")
    .delete()
    .eq("listing_id", listingId);
  return { error };
}

export async function reportListing(listingId: number, reason: string) {
  const text = reason.trim();
  if (!text) return { error: new Error("Please tell us what is wrong with this post.") };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Please log in first.") };

  const { error } = await supabase
    .from("post_reports")
    .insert({ listing_id: listingId, reporter_id: auth.user.id, reason: text });
  if (error?.code === "23505") {
    return { error: new Error("You have already reported this post.") };
  }
  return { error };
}