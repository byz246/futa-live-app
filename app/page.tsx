"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};
type Media = { url: string; type: string; name: string };
type Post = {
  id?: number;
  user_id?: string | null;
  name: string;
  category: string;
  time: string;
  text: string;
  image?: string | null;
  whatsapp?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  details?: { values?: Record<string, string>; media?: Media[] } | null;
};
type Field = {
  k: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "time" | "tel" | "number";
  options?: string[];
  required?: boolean;
  placeholder?: string;
};
type Section = { key: string; label: string; icon: string; fields: Field[] };

const SECTIONS: Section[] = [
  {
    key: "Announcements",
    label: "Announcements",
    icon: "📢",
    fields: [
      { k: "title", label: "Title", required: true, placeholder: "What is the announcement?" },
      { k: "details", label: "Details", type: "textarea", required: true },
    ],
  },
  {
    key: "For sale",
    label: "Student Marketplace",
    icon: "🛍️",
    fields: [
      { k: "product", label: "Product name", required: true, placeholder: "e.g. iPhone 12" },
      { k: "category", label: "Category", type: "select", required: true, options: ["Phones & Electronics", "Laptops", "Perfumes", "Clothes", "Shoes", "Accessories", "Other"] },
      { k: "price", label: "Price (₦)", type: "number", required: true },
      { k: "condition", label: "Condition", type: "select", required: true, options: ["Brand new", "Fairly used", "Used"] },
      { k: "details", label: "Description", type: "textarea" },
      { k: "location", label: "Location", required: true, placeholder: "Campus or off-campus area" },
      { k: "whatsapp", label: "WhatsApp number", type: "tel", required: true, placeholder: "2348012345678" },
    ],
  },
  {
    key: "Food",
    label: "Food & Snacks",
    icon: "🍔",
    fields: [
      { k: "item", label: "Food or snack", required: true, placeholder: "e.g. Jollof rice, chin chin" },
      { k: "price", label: "Price (₦)", type: "number", required: true },
      { k: "location", label: "Location", required: true },
      { k: "hours", label: "Opening hours", placeholder: "e.g. 8am - 8pm" },
      { k: "service", label: "Pickup or delivery", type: "select", options: ["Pickup", "Delivery", "Pickup and delivery"] },
      { k: "details", label: "More details", type: "textarea" },
      { k: "whatsapp", label: "WhatsApp number", type: "tel", required: true, placeholder: "2348012345678" },
    ],
  },
  {
    key: "Tutorials",
    label: "Tutorials",
    icon: "📚",
    fields: [
      { k: "level", label: "Level", type: "select", required: true, options: ["100L", "200L"] },
      { k: "course", label: "Course", required: true, placeholder: "e.g. MTH 101" },
      { k: "date", label: "Date", type: "date", required: true },
      { k: "from", label: "From", type: "time", required: true },
      { k: "to", label: "To", type: "time", required: true },
      { k: "location", label: "Location", required: true },
      { k: "tutor", label: "Tutor's name", required: true },
      { k: "sponsor", label: "Sponsored by", required: true },
      { k: "details", label: "Extra notes", type: "textarea" },
    ],
  },
  {
    key: "Lost and found",
    label: "Lost & Found",
    icon: "🔎",
    fields: [
      { k: "kind", label: "Lost or found?", type: "select", required: true, options: ["Lost", "Found"] },
      { k: "item", label: "Item", required: true, placeholder: "e.g. Black wallet" },
      { k: "details", label: "Description", type: "textarea", required: true },
      { k: "location", label: "Where?", required: true },
      { k: "date", label: "Date", type: "date" },
      { k: "whatsapp", label: "WhatsApp number", type: "tel", required: true, placeholder: "2348012345678" },
    ],
  },
];

const BUCKETS = { image: "post-images", video: "post-videos", file: "post-files" };
const MAX_MB = 50;
const MAX_FILES = 6;
const ADMIN = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
const INPUT =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const sectionOf = (key: string) => SECTIONS.find((s) => s.key === key);
const fmtDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime())
    ? "Recently"
    : t.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"home" | "profile">("home");
  const [section, setSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  // auth form
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState("");

  // composer
  const [picker, setPicker] = useState(false);
  const [composer, setComposer] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [oldMedia, setOldMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoCamRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN;
  const myName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "FUTA Student";

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user ?? null);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (alive) setUser(s?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("id", { ascending: false })
      .limit(300);
    if (error) console.error(error.message);
    else setPosts((data ?? []) as Post[]);
  }

  async function handleAuth() {
    setAuthMsg("");
    if (!email.trim() || !password) return setAuthMsg("Enter your email and password.");
    if (mode === "signup" && !fullName.trim()) return setAuthMsg("Enter your full name.");
    if (mode === "signup" && password.length < 6) return setAuthMsg("Password must be at least 6 characters.");
    setAuthBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        if (data.session) setUser(data.user);
        else setAuthMsg("Account created. Check your email for the confirmation link, then log in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setUser(data.user);
      }
      setPassword("");
    } catch (e) {
      setAuthMsg(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setTab("home");
    setSection(null);
  }

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  /* ---------- composer ---------- */
  function openComposer(key: string, post?: Post) {
    const sec = sectionOf(key)!;
    const base: Record<string, string> = {};
    sec.fields.forEach((f) => (base[f.k] = f.type === "select" ? f.options?.[0] ?? "" : ""));
    setValues(post?.details?.values ? { ...base, ...post.details.values } : post ? { ...base, details: post.text } : base);
    setOldMedia(post?.details?.media ?? []);
    setFiles([]);
    setEditing(post ?? null);
    setMsg("");
    setPicker(false);
    setComposer(key);
  }

  function closeComposer() {
    setComposer(null);
    setEditing(null);
    setFiles([]);
    setMsg("");
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setMsg(`"${f.name}" is larger than ${MAX_MB}MB.`);
        continue;
      }
      if (next.length + oldMedia.length >= MAX_FILES) {
        setMsg(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  async function upload(file: File, uid: string): Promise<Media> {
    const bucket = file.type.startsWith("image/")
      ? BUCKETS.image
      : file.type.startsWith("video/")
        ? BUCKETS.video
        : BUCKETS.file;
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return {
      url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      type: file.type || "application/octet-stream",
      name: file.name,
    };
  }

  async function submit() {
    if (!user || !composer) return;
    const sec = sectionOf(composer)!;
    for (const f of sec.fields) {
      if (f.required && !values[f.k]?.trim()) return setMsg(`Please fill in: ${f.label}`);
    }
    if (values.whatsapp && !/^[+\d\s()-]{7,20}$/.test(values.whatsapp.trim()))
      return setMsg("Enter a valid WhatsApp number, e.g. 2348012345678.");
    if (composer === "Tutorials" && values.from && values.to && values.to <= values.from)
      return setMsg("The end time must be after the start time.");
    if (composer === "Lost and found" && files.length + oldMedia.length === 0)
      return setMsg("Add a photo or video of the item.");

    setBusy(true);
    setMsg("");
    try {
      const uploaded: Media[] = [];
      for (const f of files) uploaded.push(await upload(f, user.id));
      const media = [...oldMedia, ...uploaded];
      const first = media[0];
      const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
      const row = {
        user_id: user.id,
        name: myName,
        category: composer,
        time: editing?.time ?? new Date().toISOString(),
        text: [clean[sec.fields[0].k], clean.details].filter(Boolean).join(" - "),
        image: media.find((m) => m.type.startsWith("image/"))?.url ?? null,
        whatsapp: clean.whatsapp || null,
        attachment_url: first?.url ?? null,
        attachment_name: first?.name ?? null,
        attachment_type: first?.type ?? null,
        details: { values: clean, media },
      };
      const q = editing?.id
        ? supabase.from("posts").update(row).eq("id", editing.id).eq("user_id", user.id)
        : supabase.from("posts").insert(row);
      const { error } = await q;
      if (error) throw error;
      closeComposer();
      setSection(composer);
      setTab("home");
      await loadPosts();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not publish. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removePost(p: Post) {
    if (!p.id || !user) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    let q = supabase.from("posts").delete().eq("id", p.id);
    if (!isAdmin) q = q.eq("user_id", user.id);
    const { error } = await q;
    if (error) return alert(`Could not delete: ${error.message}`);
    loadPosts();
  }

  async function report(p: Post) {
    if (!p.id || !user) return;
    const { error } = await supabase.from("reports").insert({ post_id: p.id, reporter_id: user.id });
    alert(error ? "Could not send report. Try again." : "Thanks. The post has been reported.");
  }

  /* ---------- filtering ---------- */
  const visible = posts.filter((p) => {
    if (section && p.category !== section) return false;
    if (section === "Tutorials" && level !== "All" && p.details?.values?.level !== level) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const hay = [p.text, p.name, p.category, ...Object.values(p.details?.values ?? {})].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const shown = !section && !search.trim() ? visible.slice(0, 8) : visible;

  /* ---------- views ---------- */
  function renderMedia(p: Post) {
    const list: Media[] = p.details?.media?.length
      ? p.details.media
      : p.attachment_url || p.image
        ? [{ url: (p.attachment_url || p.image)!, type: p.attachment_type || "image/*", name: p.attachment_name || "Attachment" }]
        : [];
    if (!list.length) return null;
    return (
      <div className={`mt-3 grid gap-2 ${list.length > 1 ? "grid-cols-2" : ""}`}>
        {list.map((m, i) =>
          m.type.startsWith("video/") ? (
            <video key={i} controls preload="metadata" className="w-full max-h-96 rounded-xl bg-black" src={m.url} />
          ) : m.type.startsWith("image/") ? (
            <a key={i} href={m.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.name} className="w-full max-h-96 rounded-xl border border-slate-100 bg-slate-50 object-cover" />
            </a>
          ) : (
            <a key={i} href={m.url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-blue-700 break-all">
              📄 {m.name}
            </a>
          )
        )}
      </div>
    );
  }

  function renderPost(p: Post) {
    const sec = sectionOf(p.category);
    const v = p.details?.values;
    const own = !!user && p.user_id === user.id;
    const titleKey = sec?.fields[0].k;
    return (
      <article key={p.id ?? p.time} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words font-bold leading-tight">{p.name}</p>
            <p className="text-xs text-slate-500">
              {sec?.icon ?? "📌"} {sec?.label ?? p.category} · {fmtDate(p.time)}
            </p>
          </div>
        </div>

        {v && sec ? (
          <div className="mt-3">
            <h3 className="break-words text-lg font-extrabold leading-snug text-slate-900">
              {p.category === "Tutorials" && v.level ? `${v.level} · ` : ""}
              {p.category === "Lost and found" && v.kind ? `${v.kind}: ` : ""}
              {v[titleKey!]}
            </h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {sec.fields
                .filter((f) => !["details", "whatsapp", "level", "kind", titleKey].includes(f.k) && v[f.k])
                .map((f) => (
                  <div key={f.k} className="contents">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd className="break-words font-semibold text-slate-800">
                      {f.k === "price" ? `₦${Number(v[f.k]).toLocaleString()}` : v[f.k]}
                    </dd>
                  </div>
                ))}
            </dl>
            {v.details && <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{v.details}</p>}
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{p.text}</p>
        )}

        {renderMedia(p)}

        {p.whatsapp && (
          <a
            href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-green-600 font-bold text-white active:bg-green-700"
          >
            Chat on WhatsApp
          </a>
        )}

        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-2 text-sm font-semibold">
          {own && (
            <button className="min-h-10 rounded-lg px-3 text-blue-700" onClick={() => openComposer(p.category, p)}>Edit</button>
          )}
          {(own || isAdmin) && (
            <button className="min-h-10 rounded-lg px-3 text-red-600" onClick={() => removePost(p)}>Delete</button>
          )}
          {!own && (
            <button className="min-h-10 rounded-lg px-3 text-slate-500" onClick={() => report(p)}>Report</button>
          )}
        </div>
      </article>
    );
  }

  /* ---------- LOGIN FIRST ---------- */
  if (booting)
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-700">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-2xl font-extrabold tracking-wide">FUTAHUB</p>
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="bg-blue-700 px-6 pb-12 pt-14 text-center text-white" style={{ paddingTop: "max(56px, env(safe-area-inset-top))" }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">🎓</div>
          <h1 className="text-4xl font-extrabold tracking-wide">FUTAHUB</h1>
          <p className="mt-1 text-blue-100">Your Campus, Your Community</p>
        </div>
        <div className="-mt-6 flex-1 rounded-t-3xl bg-white px-6 pb-10 pt-6">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setAuthMsg(""); }} className={`min-h-11 rounded-lg text-sm font-bold ${mode === m ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"}`}>
                  {m === "login" ? "Log in" : "Create account"}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-4">
              {mode === "signup" && (
                <input className={INPUT} placeholder="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              )}
              <input className={INPUT} type="email" placeholder="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={INPUT} type="password" placeholder="Password (min. 6 characters)" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
              {authMsg && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{authMsg}</p>}
              <button type="submit" disabled={authBusy} className="min-h-12 w-full rounded-xl bg-blue-700 font-bold text-white disabled:opacity-60">
                {authBusy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
            {installEvt && (
              <button onClick={install} className="mt-4 min-h-12 w-full rounded-xl border border-blue-200 font-bold text-blue-700">
                Install FUTAHUB app
              </button>
            )}
          </div>
        </div>
      </div>
    );

  /* ---------- APP ---------- */
  const sec = section ? sectionOf(section) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          {sec && tab === "home" ? (
            <button onClick={() => { setSection(null); setSearch(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl text-xl hover:bg-slate-100" aria-label="Back">←</button>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-xl text-white">🎓</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold leading-tight tracking-wide text-blue-800">
              {sec && tab === "home" ? sec.label : "FUTAHUB"}
            </p>
            {!(sec && tab === "home") && <p className="text-xs text-slate-500">Your Campus, Your Community</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {tab === "profile" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-800">{myName.charAt(0).toUpperCase()}</div>
              <p className="mt-3 text-lg font-bold">{myName}</p>
              <p className="break-all text-sm text-slate-500">{user.email}</p>
            </div>
            {installEvt && <button onClick={install} className="min-h-12 w-full rounded-xl bg-blue-700 font-bold text-white">Install FUTAHUB app</button>}
            <button onClick={logout} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white font-bold text-red-600">Log out</button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              {!sec && <p className="mb-2 text-lg font-bold">What do you need?</p>}
              <input className={`${INPUT} bg-slate-50`} placeholder={sec ? `Search ${sec.label}...` : "Search campus information..."} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {!sec && !search.trim() && (
              <div className="mb-6 grid grid-cols-2 gap-3">
                {SECTIONS.map((s, i) => (
                  <button key={s.key} onClick={() => { setSection(s.key); setLevel("All"); }} className={`flex min-h-[104px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-blue-50 ${i === SECTIONS.length - 1 ? "col-span-2" : ""}`}>
                    <span className="text-3xl">{s.icon}</span>
                    <span className="font-bold text-slate-800">{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {sec?.key === "Tutorials" && (
              <div className="mb-4 flex gap-2">
                {["All", "100L", "200L"].map((l) => (
                  <button key={l} onClick={() => setLevel(l)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${level === l ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</button>
                ))}
              </div>
            )}

            {sec && (
              <button onClick={() => openComposer(sec.key)} className="mb-4 min-h-12 w-full rounded-xl bg-blue-700 font-bold text-white">
                + Post in {sec.label}
              </button>
            )}

            {!sec && !search.trim() && <h2 className="mb-3 text-lg font-extrabold">Latest updates</h2>}

            <div className="space-y-4">
              {shown.map(renderPost)}
              {shown.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
                  <p className="text-4xl">{sec?.icon ?? "📰"}</p>
                  <p className="mt-3 font-bold">Nothing here yet</p>
                  <p className="mt-1 text-sm text-slate-500">Be the first to post.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-3xl grid-cols-3">
          <button onClick={() => { setTab("home"); setSection(null); setSearch(""); }} className={`flex min-h-16 flex-col items-center justify-center text-xs font-bold ${tab === "home" ? "text-blue-700" : "text-slate-500"}`}><span className="text-xl">🏠</span>Home</button>
          <button onClick={() => (sec && tab === "home" ? openComposer(sec.key) : setPicker(true))} className="flex min-h-16 flex-col items-center justify-center text-xs font-bold text-blue-700"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-2xl leading-none text-white">+</span>Post</button>
          <button onClick={() => setTab("profile")} className={`flex min-h-16 flex-col items-center justify-center text-xs font-bold ${tab === "profile" ? "text-blue-700" : "text-slate-500"}`}><span className="text-xl">👤</span>Profile</button>
        </div>
      </nav>

      {/* section picker */}
      {picker && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/50" onClick={() => setPicker(false)}>
          <div className="mx-auto w-full max-w-3xl rounded-t-3xl bg-white p-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-lg font-extrabold">What do you want to post?</p>
            <div className="space-y-2">
              {SECTIONS.map((s) => (
                <button key={s.key} onClick={() => openComposer(s.key)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 px-4 text-left font-bold active:bg-blue-50"><span className="text-2xl">{s.icon}</span>{s.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* composer */}
      {composer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <button onClick={closeComposer} className="min-h-10 px-1 font-semibold text-slate-600">Cancel</button>
            <p className="font-extrabold">{editing ? "Edit" : "New"} {sectionOf(composer)!.label}</p>
            <button onClick={submit} disabled={busy} className="min-h-10 rounded-lg bg-blue-700 px-4 font-bold text-white disabled:opacity-60">{busy ? "..." : editing ? "Save" : "Post"}</button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-xl space-y-4">
              {sectionOf(composer)!.fields.map((f) => (
                <div key={f.k}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{f.label}{f.required ? " *" : ""}</label>
                  {f.type === "textarea" ? (
                    <textarea rows={4} className={`${INPUT} py-3`} value={values[f.k] ?? ""} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })} />
                  ) : f.type === "select" ? (
                    <select className={INPUT} value={values[f.k] ?? ""} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })}>
                      {f.options!.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className={INPUT} type={f.type ?? "text"} inputMode={f.type === "number" ? "numeric" : undefined} placeholder={f.placeholder} value={values[f.k] ?? ""} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })} />
                  )}
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <p className="mb-3 font-semibold">Add photos, video or files{composer === "Lost and found" ? " *" : ""}</p>
                <div className="grid grid-cols-2 gap-2 text-sm font-bold text-blue-800">
                  <button type="button" onClick={() => cameraRef.current?.click()} className="min-h-12 rounded-xl bg-blue-50">📷 Take photo</button>
                  <button type="button" onClick={() => videoCamRef.current?.click()} className="min-h-12 rounded-xl bg-blue-50">🎥 Record video</button>
                  <button type="button" onClick={() => photoRef.current?.click()} className="min-h-12 rounded-xl bg-blue-50">🖼️ Choose photos</button>
                  <button type="button" onClick={() => videoRef.current?.click()} className="min-h-12 rounded-xl bg-blue-50">🎞️ Choose video</button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="col-span-2 min-h-12 rounded-xl bg-blue-50">📎 Choose a file</button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <input ref={videoCamRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <p className="mt-2 text-xs text-slate-500">Up to {MAX_FILES} files, {MAX_MB}MB each.</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {oldMedia.map((m, i) => (
                    <div key={`o${i}`} className="relative">
                      <Thumb type={m.type} url={m.url} name={m.name} />
                      <button onClick={() => setOldMedia(oldMedia.filter((_, j) => j !== i))} className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/70 text-white" aria-label="Remove">×</button>
                    </div>
                  ))}
                  {previews.map((p, i) => (
                    <div key={`n${i}`} className="relative">
                      <Thumb type={p.f.type} url={p.url} name={p.f.name} />
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/70 text-white" aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {msg && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
              <button onClick={submit} disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-700 font-bold text-white disabled:opacity-60">
                {busy ? "Publishing..." : editing ? "Save changes" : "Publish post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ type, url, name }: { type: string; url: string; name: string }) {
  if (type.startsWith("image/"))
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-24 w-full rounded-lg object-cover" />;
  if (type.startsWith("video/"))
    return <video src={url} className="h-24 w-full rounded-lg bg-black object-cover" muted />;
  return <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 p-1 text-center text-[11px] break-all">📄 {name}</div>;
}