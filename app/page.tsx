"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Category =
  | "Campus gist"
  | "Announcements"
  | "For sale"
  | "Accommodation"
  | "Food"
  | "Lost and found"
  | "Other";

type Attachment = {
  url: string;
  name: string;
  type: string;
  path: string;
  bucket: string;
};

type Post = {
  id: number;
  user_id: string | null;
  name: string;
  category: string;
  title: string | null;
  content: string;
  price: string | null;
  location: string | null;
  item_condition: string | null;
  whatsapp: string | null;
  attachments: Attachment[];
  created_at: string;
};

const CATEGORIES: {
  name: Category;
  icon: string;
  description: string;
}[] = [
  {
    name: "Campus gist",
    icon: "💬",
    description: "Connect with the FUTA community.",
  },
  {
    name: "Announcements",
    icon: "📢",
    description: "Important campus news and notices.",
  },
  {
    name: "For sale",
    icon: "🛍️",
    description: "Buy and sell items on campus.",
  },
  {
    name: "Accommodation",
    icon: "🏠",
    description: "Find rooms and accommodation.",
  },
  {
    name: "Food",
    icon: "🍽️",
    description: "Discover food and food vendors.",
  },
  {
    name: "Lost and found",
    icon: "🔎",
    description: "Report lost items and help others.",
  },
  {
    name: "Other",
    icon: "📌",
    description: "Share other useful information.",
  },
];

const ALLOWED_CATEGORIES = CATEGORIES.map((category) => category.name);

const EMPTY_FORM = {
  title: "",
  content: "",
  price: "",
  location: "",
  item_condition: "",
  whatsapp: "",
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normaliseWhatsApp(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    digits = "234" + digits.slice(1);
  }

  return digits;
}

function isImage(type: string) {
  return type.startsWith("image/");
}

function isVideo(type: string) {
  return type.startsWith("video/");
}

function isDocument(type: string, name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  return (
    type === "application/pdf" ||
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("powerpoint") ||
    type === "text/plain" ||
    type === "text/csv" ||
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "csv",
    ].includes(extension)
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "FS";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<Category>("Campus gist");

  const [search, setSearch] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    Attachment[]
  >([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeInfo =
    CATEGORIES.find((category) => category.name === activeCategory) ??
    CATEGORIES[0];

  const documentsAllowed =
    activeCategory === "Announcements" || activeCategory === "Other";

  const marketplaceCategory = [
    "For sale",
    "Accommodation",
    "Food",
    "Lost and found",
  ].includes(activeCategory);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);

    const { data, error: loadError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (loadError) {
      setError(
        "Could not load posts. Check your Supabase database and SQL setup."
      );
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    const normalisedPosts: Post[] = (data ?? [])
      .filter((row: Record<string, unknown>) => {
        const category = String(row.category ?? "");

        return ALLOWED_CATEGORIES.includes(category as Category);
      })
      .map((row: Record<string, unknown>) => {
        let attachments: Attachment[] = [];

        if (Array.isArray(row.attachments)) {
          attachments = row.attachments as Attachment[];
        }

        // Support posts created with the older image/file columns.
        if (
          attachments.length === 0 &&
          typeof row.image_url === "string" &&
          row.image_url
        ) {
          attachments.push({
            url: row.image_url,
            name: "Image",
            type: "image/unknown",
            path: "",
            bucket: "post-images",
          });
        }

        if (
          attachments.length === 0 &&
          typeof row.file_url === "string" &&
          row.file_url
        ) {
          attachments.push({
            url: row.file_url,
            name:
              typeof row.file_name === "string"
                ? row.file_name
                : "Attached file",
            type: "application/octet-stream",
            path: "",
            bucket: "post-files",
          });
        }

        return {
          id: Number(row.id),
          user_id:
            typeof row.user_id === "string" ? row.user_id : null,
          name:
            typeof row.name === "string" && row.name.trim()
              ? row.name
              : "FUTA Student",
          category: String(row.category),
          title: typeof row.title === "string" ? row.title : null,
          content: String(row.content ?? ""),
          price: typeof row.price === "string" ? row.price : null,
          location:
            typeof row.location === "string" ? row.location : null,
          item_condition:
            typeof row.item_condition === "string"
              ? row.item_condition
              : null,
          whatsapp:
            typeof row.whatsapp === "string" ? row.whatsapp : null,
          attachments,
          created_at: String(row.created_at ?? new Date().toISOString()),
        };
      });

    setPosts(normalisedPosts);
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user ?? null);
        setAuthLoading(false);
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts.filter((post) => {
      if (post.category !== activeCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        post.title,
        post.content,
        post.name,
        post.location,
        post.price,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [posts, activeCategory, search]);

  function openCategory(category: Category) {
    setActiveCategory(category);
    setSearch("");
    setError("");
    setMessage("");
    resetForm();
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setExistingAttachments([]);
    setEditingId(null);
  }

  function updateForm(
    field: keyof typeof EMPTY_FORM,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (authMode === "signup") {
        if (authName.trim().length < 2) {
          throw new Error("Enter your full name.");
        }

        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: authEmail.trim(),
            password: authPassword,
            options: {
              data: {
                full_name: authName.trim(),
              },
            },
          });

        if (signupError) {
          throw signupError;
        }

        if (data.session) {
          setUser(data.user);
          setShowAuth(false);
          setMessage("Your account has been created successfully.");
        } else {
          setShowAuth(false);
          setMessage(
            "Account created. Check your email to confirm your account before logging in."
          );
        }
      } else {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: authEmail.trim(),
            password: authPassword,
          });

        if (loginError) {
          throw loginError;
        }

        setUser(data.user);
        setShowAuth(false);
        setMessage("You are now logged in.");
      }

      setAuthPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setError("");
    setMessage("");

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    setUser(null);
    resetForm();
    setMessage("You have logged out.");
  }

  function handleFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    const incoming = Array.from(files);
    const accepted: File[] = [];

    for (const file of incoming) {
      if (isImage(file.type)) {
        if (file.size > MAX_IMAGE_SIZE) {
          setError(`${file.name} exceeds the 10 MB image limit.`);
          continue;
        }

        accepted.push(file);
        continue;
      }

      if (isVideo(file.type)) {
        if (file.size > MAX_VIDEO_SIZE) {
          setError(`${file.name} exceeds the 100 MB video limit.`);
          continue;
        }

        accepted.push(file);
        continue;
      }

      if (documentsAllowed && isDocument(file.type, file.name)) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`${file.name} exceeds the 20 MB document limit.`);
          continue;
        }

        accepted.push(file);
        continue;
      }

      setError(
        documentsAllowed
          ? `${file.name} is not a supported image, video, or document.`
          : `${file.name} is not allowed here. Upload photos or videos only.`
      );
    }

    setSelectedFiles((previous) => [...previous, ...accepted]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function removeExistingAttachment(index: number) {
    setExistingAttachments((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function startEditing(post: Post) {
    if (!user || post.user_id !== user.id) {
      setError("You can only edit your own posts.");
      return;
    }

    setActiveCategory(post.category as Category);
    setEditingId(post.id);

    setForm({
      title: post.title ?? "",
      content: post.content,
      price: post.price ?? "",
      location: post.location ?? "",
      item_condition: post.item_condition ?? "",
      whatsapp: post.whatsapp ?? "",
    });

    setExistingAttachments(post.attachments);
    setSelectedFiles([]);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadAttachments(): Promise<Attachment[]> {
    if (!user) {
      throw new Error("Please log in before uploading files.");
    }

    const uploaded: Attachment[] = [];

    for (const file of selectedFiles) {
      let bucket = "post-images";

      if (isVideo(file.type)) {
        bucket = "post-videos";
      } else if (documentsAllowed && isDocument(file.type, file.name)) {
        bucket = "post-files";
      }

      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "_")
        .slice(-120);

      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw new Error(
          `Could not upload ${file.name}: ${uploadError.message}`
        );
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);

      uploaded.push({
        url: data.publicUrl,
        name: file.name,
        type: file.type || "application/octet-stream",
        path,
        bucket,
      });
    }

    return uploaded;
  }

  async function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setShowAuth(true);
      setAuthMode("login");
      setError("Please log in before publishing a post.");
      return;
    }

    if (!form.content.trim()) {
      setError("Please enter the post description.");
      return;
    }

    if (
      ["For sale", "Accommodation", "Food"].includes(activeCategory) &&
      !form.price.trim()
    ) {
      setError("Please enter the price.");
      return;
    }

    if (
      ["For sale", "Accommodation", "Food", "Lost and found"].includes(
        activeCategory
      ) &&
      !form.whatsapp.trim()
    ) {
      setError("Please enter a WhatsApp contact number.");
      return;
    }

    const whatsapp = form.whatsapp.trim()
      ? normaliseWhatsApp(form.whatsapp)
      : "";

    if (
      form.whatsapp.trim() &&
      (whatsapp.length < 10 || whatsapp.length > 15)
    ) {
      setError("Enter a valid WhatsApp number with country code if needed.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    let newUploads: Attachment[] = [];

    try {
      newUploads = await uploadAttachments();

      const attachments = [
        ...existingAttachments,
        ...newUploads,
      ];

      const postName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "FUTA Student";

      const payload = {
        user_id: user.id,
        name: String(postName).trim().slice(0, 100),
        category: activeCategory,
        title: form.title.trim() || null,
        content: form.content.trim(),
        price: form.price.trim() || null,
        location: form.location.trim() || null,
        item_condition: form.item_condition.trim() || null,
        whatsapp: whatsapp || null,
        attachments,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        setMessage("Your post has been updated.");
      } else {
        const { error: insertError } = await supabase
          .from("posts")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setMessage("Your post has been published.");
      }

      resetForm();
      await loadPosts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while publishing your post."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(post: Post) {
    if (!user || post.user_id !== user.id) {
      setError("You can only delete your own posts.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setPosts((previous) =>
      previous.filter((item) => item.id !== post.id)
    );

    setMessage("Post deleted successfully.");
  }

  function renderAttachments(attachments: Attachment[]) {
    if (!attachments.length) {
      return null;
    }

    return (
      <div className="attachment-grid">
        {attachments.map((attachment, index) => {
          const key = `${attachment.url}-${index}`;

          if (isImage(attachment.type)) {
            return (
              <a
                className="attachment"
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                key={key}
              >
                <img
                  src={attachment.url}
                  alt={attachment.name || "Post image"}
                  loading="lazy"
                />
              </a>
            );
          }

          if (isVideo(attachment.type)) {
            return (
              <div className="attachment" key={key}>
                <video
                  src={attachment.url}
                  controls
                  preload="metadata"
                />
              </div>
            );
          }

          return (
            <a
              className="attachment-link"
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              key={key}
            >
              <span className="file-icon">📄</span>
              <span>
                <strong>{attachment.name}</strong>
                <small>Open or download file</small>
              </span>
            </a>
          );
        })}
      </div>
    );
  }

  function renderPost(post: Post) {
    const categoryInfo = CATEGORIES.find(
      (category) => category.name === post.category
    );

    const isOwner = Boolean(user && user.id === post.user_id);

    const whatsapp = post.whatsapp
      ? normaliseWhatsApp(post.whatsapp)
      : "";

    return (
      <article className="post-card" key={post.id}>
        <div className="post-card-header">
          <div className="user-info">
            <div className="user-avatar">
              {getInitials(post.name)}
            </div>

            <div className="user-details">
              <div className="user-name">{post.name}</div>
              <div className="post-time">
                {formatDate(post.created_at)}
              </div>
            </div>
          </div>

          <span className="category-badge">
            {categoryInfo?.icon ?? "📌"} {post.category}
          </span>
        </div>

        <div className="post-card-body">
          {post.title && <h3 className="post-title">{post.title}</h3>}

          <p className="post-content">{post.content}</p>

          {post.price && (
            <div className="post-price">
              ₦{post.price.replace(/^₦\s*/, "")}
            </div>
          )}

          <div className="post-meta">
            {post.location && (
              <span>📍 {post.location}</span>
            )}

            {post.item_condition && (
              <span>📦 {post.item_condition}</span>
            )}
          </div>

          {renderAttachments(post.attachments)}

          {whatsapp && (
            <a
              className="btn btn-whatsapp contact-button"
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>☏</span> Contact on WhatsApp
            </a>
          )}
        </div>

        {isOwner && (
          <div className="post-card-footer">
            <span className="owner-label">Your post</span>

            <div className="post-actions">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => startEditing(post)}
                type="button"
              >
                Edit
              </button>

              <button
                className="btn btn-danger btn-small"
                onClick={() => void deletePost(post)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <main className="app-container">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => openCategory("Campus gist")}
            type="button"
            aria-label="Go to FUTA Live home"
          >
            <span className="brand-logo">F</span>

            <span>
              FUTA <span className="brand-highlight">Live</span>
            </span>
          </button>

          <div className="header-actions">
            {user ? (
              <>
                <span className="header-user">
                  <span className="online-dot" />
                  {String(
                    user.user_metadata?.full_name ||
                      user.email?.split("@")[0] ||
                      "Student"
                  ).split(" ")[0]}
                </span>

                <button
                  className="btn btn-secondary"
                  onClick={() => void handleLogout()}
                  type="button"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuth(true);
                  }}
                  type="button"
                >
                  Log in
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuth(true);
                  }}
                  type="button"
                >
                  Join FUTA Live
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              THE FUTA STUDENT COMMUNITY
            </span>

            <h1>
              Your campus.
              <br />
              <span>Your community.</span>
            </h1>

            <p>
              Discover campus updates, buy and sell, find accommodation,
              share information, and stay connected with the FUTA
              community.
            </p>

            <button
              className="btn btn-white"
              onClick={() => {
                if (!user) {
                  setAuthMode("signup");
                  setShowAuth(true);
                } else {
                  document
                    .getElementById("create-post")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              type="button"
            >
              {user ? "Share something" : "Join the community"} →
            </button>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />

            <div className="hero-glass-card">
              <div className="hero-card-top">
                <span className="hero-mini-logo">F</span>
                <span>FUTA Live</span>
                <span className="hero-live-dot" />
              </div>

              <div className="hero-card-main">
                <div className="hero-message-icon">💬</div>
                <strong>Campus life, connected.</strong>
                <span>Everything happening in one place.</span>
              </div>

              <div className="hero-card-bottom">
                <span>📢 Updates</span>
                <span>🛍️ Marketplace</span>
                <span>🏠 Housing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stats-inner">
          <div>
            <span className="stat-icon">💬</span>
            <span>
              <strong>Campus gist</strong>
              <small>Conversations and updates</small>
            </span>
          </div>

          <div>
            <span className="stat-icon">🛍️</span>
            <span>
              <strong>Marketplace</strong>
              <small>Buy and sell on campus</small>
            </span>
          </div>

          <div>
            <span className="stat-icon">🏠</span>
            <span>
              <strong>Accommodation</strong>
              <small>Discover available spaces</small>
            </span>
          </div>
        </div>
      </section>

      <div className="page-container">
        {message && (
          <div className="alert alert-success" role="status">
            <span>✓</span> {message}
            <button
              className="alert-close"
              onClick={() => setMessage("")}
              type="button"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            <span>!</span> {error}
            <button
              className="alert-close"
              onClick={() => setError("")}
              type="button"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="main-grid">
          <aside className="sidebar">
            <section className="sidebar-card">
              <div className="sidebar-heading">YOUR CAMPUS</div>

              <nav className="nav-menu" aria-label="Campus categories">
                {CATEGORIES.map((category) => (
                  <button
                    className={`nav-item ${
                      activeCategory === category.name ? "active" : ""
                    }`}
                    onClick={() => openCategory(category.name)}
                    type="button"
                    key={category.name}
                  >
                    <span className="nav-icon">{category.icon}</span>

                    <span className="nav-label">{category.name}</span>

                    <span className="nav-count">
                      {posts.filter(
                        (post) => post.category === category.name
                      ).length}
                    </span>
                  </button>
                ))}
              </nav>
            </section>

            <section className="sidebar-note">
              <div className="sidebar-note-icon">💙</div>
              <h3>Welcome to FUTA Live</h3>
              <p>
                A shared space for the FUTA community. Stay informed,
                connect with students, and share useful information.
              </p>

              {!user && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuth(true);
                  }}
                  type="button"
                >
                  Create an account
                </button>
              )}
            </section>
          </aside>

          <section className="main-content">
            <div className="category-header">
              <div className="category-heading">
                <div className="category-icon">{activeInfo.icon}</div>

                <div>
                  <h2 className="section-title">
                    {activeCategory}
                  </h2>

                  <p className="section-description">
                    {activeInfo.description}
                  </p>
                </div>
              </div>

              <span className="result-count">
                {visiblePosts.length}{" "}
                {visiblePosts.length === 1 ? "post" : "posts"}
              </span>
            </div>

            <div className="search-box">
              <span className="search-icon">⌕</span>

              <input
                className="search-input"
                type="search"
                placeholder={`Search ${activeCategory.toLowerCase()}...`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search posts in this category"
              />
            </div>

            <section className="create-post" id="create-post">
              <div className="create-post-header">
                <div className="create-avatar">
                  {user
                    ? getInitials(
                        String(
                          user.user_metadata?.full_name ||
                            user.email?.split("@")[0] ||
                            "FUTA Student"
                        )
                      )
                    : "F"}
                </div>

                <div className="create-post-heading">
                  <h3 className="create-post-title">
                    {editingId !== null ? "Edit your post" : "Share with FUTA"}
                  </h3>

                  <p className="create-post-subtitle">
                    Posting in{" "}
                    <strong>{activeCategory}</strong>
                  </p>
                </div>

                <span className="secure-badge">● Community</span>
              </div>

              {!user && (
                <div className="login-notice">
                  <span>🔒</span>

                  <span>
                    Log in to publish posts, upload files, and manage your
                    content.
                  </span>

                  <button
                    className="text-button"
                    onClick={() => {
                      setAuthMode("login");
                      setShowAuth(true);
                    }}
                    type="button"
                  >
                    Log in
                  </button>
                </div>
              )}

              <form onSubmit={handlePostSubmit}>
                <div className="form-group">
                  <label htmlFor="post-title">
                    Title <span className="optional">(optional)</span>
                  </label>

                  <input
                    id="post-title"
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="Give your post a clear title"
                    maxLength={160}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="post-content">
                    Description <span className="required">*</span>
                  </label>

                  <textarea
                    id="post-content"
                    value={form.content}
                    onChange={(event) =>
                      updateForm("content", event.target.value)
                    }
                    placeholder={
                      activeCategory === "Lost and found"
                        ? "Describe the lost or found item, when it was seen, and any useful details..."
                        : `What would you like to share in ${activeCategory.toLowerCase()}?`
                    }
                    maxLength={10000}
                    required
                  />

                  <span className="character-count">
                    {form.content.length}/10,000
                  </span>
                </div>

                {marketplaceCategory && (
                  <div className="form-row">
                    {activeCategory !== "Lost and found" && (
                      <div className="form-group">
                        <label htmlFor="post-price">
                          Price (₦) <span className="required">*</span>
                        </label>

                        <input
                          id="post-price"
                          value={form.price}
                          onChange={(event) =>
                            updateForm("price", event.target.value)
                          }
                          placeholder="e.g. 15000"
                          maxLength={30}
                          required
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="post-location">
                        {activeCategory === "Lost and found"
                          ? "Location"
                          : "Location"}
                      </label>

                      <input
                        id="post-location"
                        value={form.location}
                        onChange={(event) =>
                          updateForm("location", event.target.value)
                        }
                        placeholder="e.g. FUTA North Gate"
                        maxLength={150}
                      />
                    </div>
                  </div>
                )}

                {activeCategory === "For sale" && (
                  <div className="form-group">
                    <label htmlFor="post-condition">Item condition</label>

                    <select
                      id="post-condition"
                      value={form.item_condition}
                      onChange={(event) =>
                        updateForm("item_condition", event.target.value)
                      }
                    >
                      <option value="">Select condition</option>
                      <option value="Brand new">Brand new</option>
                      <option value="Used - like new">Used - like new</option>
                      <option value="Used - good condition">
                        Used - good condition
                      </option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                )}

                {[
                  "For sale",
                  "Accommodation",
                  "Food",
                  "Lost and found",
                ].includes(activeCategory) && (
                  <div className="form-group">
                    <label htmlFor="post-whatsapp">
                      WhatsApp contact number{" "}
                      <span className="required">*</span>
                    </label>

                    <input
                      id="post-whatsapp"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(event) =>
                        updateForm("whatsapp", event.target.value)
                      }
                      placeholder="e.g. 08012345678 or +2348012345678"
                      maxLength={25}
                      required
                    />

                    <span className="field-help">
                      People can contact you directly on WhatsApp.
                    </span>
                  </div>
                )}

                <div className="upload-panel">
                  <div className="upload-heading">
                    <div>
                      <strong>Add media or files</strong>

                      <p>
                        Photos up to 10 MB and videos up to 100 MB.
                        {documentsAllowed &&
                          " Documents up to 20 MB are also allowed."}
                      </p>
                    </div>

                    <span className="upload-icon">↥</span>
                  </div>

                  <div className="upload-buttons">
                    <label className="upload-button" htmlFor="media-upload">
                      <span>📷</span>
                      <span>Photos & videos</span>
                    </label>

                    {documentsAllowed && (
                      <label
                        className="upload-button"
                        htmlFor="file-upload"
                      >
                        <span>📄</span>
                        <span>Documents & files</span>
                      </label>
                    )}
                  </div>

                  <input
                    id="media-upload"
                    className="hidden-input"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(event) => {
                      handleFiles(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />

                  {documentsAllowed && (
                    <input
                      id="file-upload"
                      className="hidden-input"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,text/plain,text/csv"
                      multiple
                      onChange={(event) => {
                        handleFiles(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  )}

                  {(selectedFiles.length > 0 ||
                    existingAttachments.length > 0) && (
                    <div className="selected-files">
                      {existingAttachments.map((file, index) => (
                        <div
                          className="selected-file"
                          key={`existing-${file.url}-${index}`}
                        >
                          <span>📎</span>
                          <span className="selected-file-name">
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeExistingAttachment(index)
                            }
                            aria-label={`Remove ${file.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {selectedFiles.map((file, index) => (
                        <div
                          className="selected-file"
                          key={`${file.name}-${file.size}-${index}`}
                        >
                          <span>
                            {isImage(file.type)
                              ? "🖼️"
                              : isVideo(file.type)
                                ? "🎥"
                                : "📄"}
                          </span>

                          <span className="selected-file-name">
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            aria-label={`Remove ${file.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  {editingId !== null && (
                    <button
                      className="btn btn-secondary"
                      onClick={resetForm}
                      type="button"
                    >
                      Cancel editing
                    </button>
                  )}

                  <button
                    className="btn btn-primary publish-button"
                    disabled={busy || authLoading}
                    type="submit"
                  >
                    {busy
                      ? "Please wait..."
                      : editingId !== null
                        ? "Save changes"
                        : "Publish post"}
                    {!busy && <span>→</span>}
                  </button>
                </div>
              </form>
            </section>

            <div className="feed-heading">
              <div>
                <h3>Latest posts</h3>
                <p>What is happening in {activeCategory.toLowerCase()}.</p>
              </div>

              <button
                className="refresh-button"
                type="button"
                onClick={() => void loadPosts()}
                disabled={postsLoading}
              >
                ↻ Refresh
              </button>
            </div>

            {postsLoading ? (
              <div className="empty-state">
                <div className="loading-spinner" />
                <p>Loading posts...</p>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  {search ? "⌕" : activeInfo.icon}
                </div>

                <h3>
                  {search ? "No matching posts" : "Nothing here yet"}
                </h3>

                <p>
                  {search
                    ? "Try another search term or clear your search."
                    : `Be the first to share something in ${activeCategory}.`}
                </p>

                {search && (
                  <button
                    className="btn btn-secondary empty-action"
                    onClick={() => setSearch("")}
                    type="button"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="post-feed">
                {visiblePosts.map(renderPost)}
              </div>
            )}

            <div className="feed-footer">
              <span className="footer-dot" />
              You are viewing {activeCategory}
              <span>·</span>
              FUTA Live
            </div>
          </section>
        </div>
      </div>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-logo">F</span>
          <strong>FUTA Live</strong>
        </div>

        <p>
          Connecting the FUTA community, one post at a time.
        </p>

        <span className="footer-copyright">
          © {new Date().getFullYear()} FUTA Live. Built for the FUTA community.
        </span>
      </footer>

      {showAuth && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuth(false);
              setError("");
            }
          }}
        >
          <section
            className="auth-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              className="modal-close"
              onClick={() => {
                setShowAuth(false);
                setError("");
              }}
              type="button"
              aria-label="Close dialog"
            >
              ×
            </button>

            <div className="auth-logo">F</div>

            <span className="auth-eyebrow">WELCOME TO FUTA LIVE</span>

            <h2 id="auth-title" className="auth-title">
              {authMode === "login"
                ? "Welcome back"
                : "Join the community"}
            </h2>

            <p className="auth-description">
              {authMode === "login"
                ? "Log in to continue to your campus community."
                : "Create an account to share posts and connect."}
            </p>

            <form onSubmit={handleAuth}>
              {authMode === "signup" && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full name</label>

                  <input
                    id="auth-name"
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email address</label>

                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>

                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(event) =>
                    setAuthPassword(event.target.value)
                  }
                  placeholder="At least 6 characters"
                  autoComplete={
                    authMode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={6}
                  required
                />
              </div>

              <button
                className="btn btn-primary btn-full auth-submit"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Log in"
                    : "Create account"}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === "login"
                ? "New to FUTA Live?"
                : "Already have an account?"}

              <button
                className="text-button"
                onClick={() => {
                  setAuthMode(
                    authMode === "login" ? "signup" : "login"
                  );
                  setError("");
                }}
                type="button"
              >
                {authMode === "login" ? "Create account" : "Log in"}
              </button>
            </div>

            <p className="auth-privacy">
              Your account is managed securely through Supabase
              Authentication.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}