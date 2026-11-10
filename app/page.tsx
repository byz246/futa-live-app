"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AuthScreen from "./components/AuthScreen";
import PostMenu from "./components/PostMenu";
import MarketplaceFeed from "./components/MarketplaceFeed";
import FoodFeed from "./components/FoodFeed";
import TutorialsFeed from "./components/TutorialsFeed";
import LostFoundFeed from "./components/LostFoundFeed";
import AnnouncementsFeed from "./components/AnnouncementsFeed";
import PostDetails from "./components/PostDetails";
import SavedPosts from "./components/SavedPosts";

type Section =
  | "Announcements"
  | "Student Marketplace"
  | "Food & Snacks"
  | "Tutorials Available"
  | "Lost & Found";

type Screen = "home" | "section" | "saved" | "profile";

const SECTIONS: {
  name: Section;
  short: string;
  icon: string;
  description: string;
}[] = [
  {
    name: "Announcements",
    short: "Announcements",
    icon: "📢",
    description: "Important updates and information from around FUTA.",
  },
  {
    name: "Student Marketplace",
    short: "Marketplace",
    icon: "🛍️",
    description: "Buy and sell items with fellow FUTA students.",
  },
  {
    name: "Food & Snacks",
    short: "Food & Snacks",
    icon: "🍔",
    description: "Discover food, snacks and refreshments around campus.",
  },
  {
    name: "Tutorials Available",
    short: "Tutorials",
    icon: "📚",
    description: "Discover tutorials and academic support opportunities.",
  },
  {
    name: "Lost & Found",
    short: "Lost & Found",
    icon: "🔎",
    description: "Help reunite lost belongings with their owners.",
  },
];

// One electric-blue accent for every section, as in the FutaHub design.
const ACCENT = "#72aaff";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const [screen, setScreen] = useState<Screen>("home");
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const [showPostMenu, setShowPostMenu] = useState(false);
  const [startWithForm, setStartWithForm] = useState(false);
  const [postRequestId, setPostRequestId] = useState(0);
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [accountMessage, setAccountMessage] = useState("");

  // Restore the Supabase login session and detect a password-reset link.
  useEffect(() => {
    let mounted = true;

    if (window.location.hash.includes("type=recovery")) setRecovering(true);

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (mounted) {
        setUser(data.session?.user ?? null);
        setAuthLoading(false);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Tapping a post card opens its full details.
  function handleContentClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label, video")) return;
    const card = target.closest("[data-listing-id]");
    if (!card) return;
    const id = Number(card.getAttribute("data-listing-id"));
    if (Number.isFinite(id)) setOpenPostId(id);
  }

  // Open a category immediately.
  function openSection(section: Section) {
    setStartWithForm(false);
    setActiveSection(section);
    setScreen("section");
  }

  function goHome() {
    setScreen("home");
    setActiveSection(null);
  }

  // The bottom Post sheet: open the chosen section, directly on its form.
  function startPost(section: Section) {
    setShowPostMenu(false);
    // Students cannot post announcements.
    if (section === "Announcements") return;
    openSection(section);
    // Lost & Found opens its own Lost / Found buttons instead.
    if (section !== "Lost & Found") {
      setStartWithForm(true);
      setPostRequestId((id) => id + 1);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAccountMessage("Unable to sign out. Please try again.");
      return;
    }

    setUser(null);
    setRecovering(false);
    setScreen("home");
    setActiveSection(null);
    setShowPostMenu(false);
    setOpenPostId(null);
    setAccountMessage("");
  }

  // Loading screen while the login session is checked.
  if (authLoading) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">F</div>
        <h2>FutaHub</h2>
        <p>Preparing your campus space...</p>
        <div className="loading-bar">
          <span />
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  // Reset-password link: choose a new password first.
  if (user && recovering) {
    return (
      <>
        <AuthScreen mode="recovery" onRecovered={() => setRecovering(false)} />
        <style jsx global>{styles}</style>
      </>
    );
  }

  // Not logged in: log in, create account, forgot password.
  if (!user) {
    return (
      <>
        <AuthScreen mode="main" />
        <style jsx global>{styles}</style>
      </>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient-glow" />

      <header className="topbar">
        <button className="brand-lockup brand-button" onClick={goHome}>
          <div className="brand-mark">F</div>
          <span>
            Futa<span className="brand-blue">Hub</span>
          </span>
        </button>

        <div className="topbar-campus">
          <span className="campus-dot" />
          FUTA STUDENT COMMUNITY
        </div>

        <button
          className="avatar-button"
          onClick={() => setScreen("profile")}
          aria-label="Open profile"
          title="My profile"
        >
          {(user.user_metadata?.full_name || user.email || "S")
            .charAt(0)
            .toUpperCase()}
        </button>
      </header>

      <div className="app-content" onClick={handleContentClick}>
        {screen === "home" && (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="live-dot" />
                  YOUR CAMPUS, CONNECTED
                </div>

                <h1>
                  Everything happening
                  <br />
                  <span>around your campus.</span>
                </h1>

                <p>
                  Discover updates, find what you need, and connect with
                  your fellow FUTA students.
                </p>

                <button
                  className="primary-button hero-button"
                  onClick={() => openSection("Announcements")}
                >
                  Explore campus <span>→</span>
                </button>
              </div>

              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="hero-symbol">F</div>
                <div className="floating-card floating-card-top">
                  <span>●</span> Campus updates
                </div>
                <div className="floating-card floating-card-bottom">
                  <span>✦</span> Student community
                </div>
              </div>

              <div className="hero-index">01 / CAMPUS LIFE</div>
            </section>

            <section className="section-heading">
              <div>
                <span className="section-kicker">YOUR CAMPUS, YOUR SPACE</span>
                <h2>Explore FutaHub</h2>
                <p>Choose a space and jump straight in.</p>
              </div>

              <span className="section-count">05 SPACES</span>
            </section>

            <section className="category-grid">
              {SECTIONS.map((section, index) => (
                <button
                  key={section.name}
                  className={`category-card category-card-${index + 1} ${
                    index === 4 ? "category-wide" : ""
                  }`}
                  onClick={() => openSection(section.name)}
                >
                  <div className="category-card-top">
                    <span className="category-icon" style={{ color: ACCENT }}>
                      {section.icon}
                    </span>

                    <span className="category-arrow">↗</span>
                  </div>

                  <div className="category-card-copy">
                    <h3>{section.name}</h3>
                    <p>{section.description}</p>
                  </div>

                  <div className="category-card-bottom">
                    <span>OPEN SPACE</span>
                    <span className="category-line" />
                  </div>
                </button>
              ))}
            </section>
          </>
        )}

        {screen === "section" && activeSection === "Announcements" && (
          <AnnouncementsFeed onBack={goHome} />
        )}

        {screen === "section" && activeSection === "Student Marketplace" && (
          <MarketplaceFeed
            key={postRequestId}
            onBack={goHome}
            startOnForm={startWithForm}
          />
        )}

        {screen === "section" && activeSection === "Food & Snacks" && (
          <FoodFeed
            key={postRequestId}
            onBack={goHome}
            startOnForm={startWithForm}
          />
        )}

        {screen === "section" && activeSection === "Tutorials Available" && (
          <TutorialsFeed
            key={postRequestId}
            onBack={goHome}
            startOnForm={startWithForm}
          />
        )}

        {screen === "section" && activeSection === "Lost & Found" && (
          <LostFoundFeed key={postRequestId} onBack={goHome} />
        )}

        {screen === "saved" && (
          <SavedPosts key={postRequestId} onExplore={goHome} />
        )}

        {screen === "profile" && (
          <section className="section-page profile-page">
            <div className="simple-page-heading">
              <span className="section-kicker">YOUR ACCOUNT</span>
              <h1>My profile</h1>
              <p>Manage your FutaHub account.</p>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">
                {(user.user_metadata?.full_name || user.email || "S")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="profile-details">
                <h2>{user.user_metadata?.full_name || "FUTA Student"}</h2>
                <p>{user.email}</p>
                <span className="profile-badge">
                  <span className="live-dot" />
                  Signed in
                </span>
              </div>
            </div>

            <div className="profile-menu">
              <button onClick={() => setScreen("saved")}>
                <span className="profile-menu-icon">♡</span>
                <span>
                  <strong>Saved</strong>
                  <small>View your bookmarked posts</small>
                </span>
                <span className="profile-menu-arrow">→</span>
              </button>

              <button onClick={goHome}>
                <span className="profile-menu-icon">⌂</span>
                <span>
                  <strong>Home</strong>
                  <small>Return to the campus homepage</small>
                </span>
                <span className="profile-menu-arrow">→</span>
              </button>
            </div>

            {accountMessage && (
              <div className="message-box" role="status" style={{ marginTop: 18 }}>
                {accountMessage}
              </div>
            )}

            <button className="logout-button" onClick={handleLogout}>
              ↗ Sign out of FutaHub
            </button>
          </section>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className={screen === "home" ? "nav-item active" : "nav-item"}
          onClick={goHome}
        >
          <span className="nav-icon">⌂</span>
          <span>Home</span>
        </button>

        <button
          className={screen === "section" ? "nav-item active" : "nav-item"}
          onClick={() => openSection("Student Marketplace")}
        >
          <span className="nav-icon">⌕</span>
          <span>Explore</span>
        </button>

        <button className="nav-item nav-post" onClick={() => setShowPostMenu(true)}>
          <span className="nav-post-icon">+</span>
          <span>Post</span>
        </button>

        <button
          className={screen === "saved" ? "nav-item active" : "nav-item"}
          onClick={() => setScreen("saved")}
        >
          <span className="nav-icon">♡</span>
          <span>Saved</span>
        </button>

        <button
          className={screen === "profile" ? "nav-item active" : "nav-item"}
          onClick={() => setScreen("profile")}
        >
          <span className="nav-icon">◉</span>
          <span>Profile</span>
        </button>
      </nav>

      {openPostId !== null && (
        <PostDetails
          id={openPostId}
          onClose={(changed) => {
            setOpenPostId(null);
            if (changed) {
              setStartWithForm(false);
              setPostRequestId((id) => id + 1);
            }
          }}
        />
      )}

      {showPostMenu && (
        <PostMenu onPick={startPost} onClose={() => setShowPostMenu(false)} />
      )}

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
:root {
  --bg: #070b14;
  --panel: #0e1523;
  --panel-light: #111c2e;
  --border: rgba(153, 178, 220, .13);
  --text: #f4f7ff;
  --muted: #8f9bb2;
  --blue: #438cff;
  --blue-bright: #4b91ff;
  --radius: 20px;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: var(--bg);
  scroll-behavior: auto;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
}

button, input, textarea, select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: .65;
  cursor: not-allowed;
}

button:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}

.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--text);
}

.loading-logo, .brand-mark {
  display: grid;
  place-items: center;
  font-weight: 900;
  background: linear-gradient(140deg, #5da2ff, #1761e8);
  color: white;
  border-radius: 13px;
  box-shadow: 0 8px 26px rgba(38, 115, 255, .25);
}

.loading-logo {
  width: 55px;
  height: 55px;
  font-size: 29px;
}

.loading-screen h2 {
  margin: 17px 0 5px;
}

.loading-screen p {
  color: var(--muted);
  font-size: 13px;
}

.loading-bar {
  width: 150px;
  height: 3px;
  border-radius: 10px;
  background: #172239;
  overflow: hidden;
  margin-top: 18px;
}

.loading-bar span {
  display: block;
  width: 45%;
  height: 100%;
  background: var(--blue);
  animation: loading 1.2s ease-in-out infinite alternate;
}

@keyframes loading {
  from { transform: translateX(-30%); }
  to { transform: translateX(150%); }
}

/* LOGIN AND SIGN-UP */

.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  display: grid;
  place-items: center;
  padding: 24px 17px;
  background:
    radial-gradient(ellipse at 18% 15%, rgba(24, 84, 180, .16), transparent 42%),
    radial-gradient(ellipse at 95% 90%, rgba(29, 83, 177, .12), transparent 38%),
    #070b14;
}

.auth-glow {
  position: absolute;
  width: 350px;
  height: 350px;
  border-radius: 50%;
  filter: blur(110px);
  pointer-events: none;
  opacity: .13;
  background: #287aff;
}

.auth-glow-one {
  top: -180px;
  left: 12%;
}

.auth-glow-two {
  right: -180px;
  bottom: -180px;
}

.auth-layout {
  width: 100%;
  max-width: 430px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  margin: auto;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 11px;
  color: white;
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -.8px;
}

.brand-mark {
  width: 39px;
  height: 39px;
  font-size: 22px;
  flex-shrink: 0;
}

.brand-blue {
  color: #62a1ff;
}

.brand-button {
  border: 0;
  background: transparent;
  padding: 0;
}

.auth-card {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: rgba(14, 21, 35, .92);
  padding: 35px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .22);
}

.auth-card-heading {
  margin-bottom: 27px;
}

.auth-mini-icon {
  display: grid;
  place-items: center;
  width: 41px;
  height: 41px;
  border-radius: 12px;
  color: #7bb0ff;
  background: rgba(67, 140, 255, .13);
  border: 1px solid rgba(67, 140, 255, .17);
  font-size: 23px;
  margin-bottom: 22px;
}

.auth-card-heading h2 {
  font-size: 26px;
  letter-spacing: -.7px;
  margin: 0 0 9px;
}

.auth-card-heading p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.auth-form, .post-form {
  display: grid;
  gap: 19px;
}

.auth-form label, .post-form label {
  display: grid;
  gap: 9px;
  color: #dce5f6;
  font-size: 12px;
  font-weight: 700;
}

.auth-form input, .post-form input,
.post-form textarea, .post-form select {
  width: 100%;
  border: 1px solid #26344a;
  border-radius: 10px;
  padding: 13px 14px;
  color: white;
  background: #0a111e;
  outline: none;
  font-size: 13px;
  transition: border-color .2s, box-shadow .2s;
}

.auth-form input:focus, .post-form input:focus,
.post-form textarea:focus, .post-form select:focus {
  border-color: #438cff;
  box-shadow: 0 0 0 3px rgba(67, 140, 255, .09);
}

.auth-form input::placeholder, .post-form input::placeholder,
.post-form textarea::placeholder {
  color: #65738b;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  border: 1px solid #438cff;
  border-radius: 10px;
  padding: 12px 17px;
  background: linear-gradient(135deg, #438cff, #246be0);
  color: white;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 7px 20px rgba(44, 112, 235, .15);
  transition: transform .2s, filter .2s;
}

.primary-button:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.primary-button span {
  font-size: 16px;
}

.auth-submit {
  width: 100%;
  min-height: 47px;
  margin-top: 3px;
}

.auth-switch {
  border-top: 1px solid var(--border);
  margin-top: 24px;
  padding-top: 22px;
  text-align: center;
  color: #9ba8be;
  font-size: 12px;
}

.auth-switch button {
  border: 0;
  background: transparent;
  color: #75aaff;
  font-size: 12px;
  font-weight: 800;
  margin-left: 6px;
}

.auth-security {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #687892;
  font-size: 10px;
  margin: 25px 0 0;
}

.auth-security span {
  color: #49d7a1;
  font-size: 8px;
}

.mobile-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 26px;
  font-size: 22px;
  font-weight: 800;
}

.message-box {
  padding: 12px 13px;
  border: 1px solid rgba(255, 175, 80, .23);
  border-radius: 9px;
  color: #ffce8a;
  background: rgba(255, 175, 80, .07);
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

/* APP LAYOUT */

.app-shell {
  min-height: 100vh;
  position: relative;
  overflow-x: clip;
  padding-bottom: 112px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(30, 75, 150, .07), transparent 40%),
    var(--bg);
}

.ambient-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 300px;
  pointer-events: none;
  background: rgba(25, 78, 173, .07);
  filter: blur(100px);
}

.topbar {
  height: 76px;
  padding: 0 max(28px, calc((100% - 1120px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  z-index: 5;
  border-bottom: 1px solid rgba(153, 178, 220, .08);
  background: rgba(7, 11, 20, .8);
}

.topbar-campus {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #8290a9;
  font-size: 9px;
  letter-spacing: 1.5px;
  font-weight: 800;
}

.campus-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  background: #49d7a1;
  box-shadow: 0 0 12px rgba(73, 215, 161, .5);
  flex-shrink: 0;
}

.avatar-button {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(93, 153, 255, .32);
  background: rgba(67, 140, 255, .12);
  color: #8fbcff;
  font-size: 15px;
  font-weight: 800;
}

.app-content {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  width: calc(100% - 56px);
  margin: 0 auto;
}

.hero-panel {
  min-height: 310px;
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  margin-top: 34px;
  padding: 42px 45px;
  border: 1px solid rgba(99, 146, 220, .18);
  border-radius: 24px;
  background:
    radial-gradient(ellipse at 84% 48%, rgba(42, 111, 232, .18), transparent 42%),
    linear-gradient(115deg, #101a2b, #0b1220 70%);
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 630px;
}

.hero-copy h1 {
  font-size: clamp(30px, 4vw, 44px);
  letter-spacing: -2px;
  line-height: 1.15;
  margin: 19px 0 13px;
}

.hero-copy h1 span {
  color: #69a4ff;
}

.hero-copy > p {
  color: #9ba9c0;
  font-size: 13px;
  line-height: 1.8;
  max-width: 470px;
  margin: 0 0 23px;
}

.hero-button {
  padding: 12px 17px;
}

.hero-art {
  position: absolute;
  width: 330px;
  height: 290px;
  right: 25px;
  top: 12px;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.orbit {
  position: absolute;
  border: 1px solid rgba(91, 148, 255, .19);
  border-radius: 50%;
  transform: rotate(-25deg);
}

.orbit-one {
  width: 255px;
  height: 175px;
}

.orbit-two {
  width: 315px;
  height: 220px;
  transform: rotate(42deg);
}

.hero-symbol {
  display: grid;
  place-items: center;
  width: 125px;
  height: 125px;
  border: 1px solid rgba(125, 179, 255, .5);
  border-radius: 32px;
  background: linear-gradient(145deg, rgba(60, 135, 255, .36), rgba(13, 29, 58, .8));
  box-shadow: 0 0 75px rgba(42, 111, 232, .23);
  color: #e1edff;
  font-size: 80px;
  font-weight: 900;
  transform: rotate(-7deg);
}

.floating-card {
  position: absolute;
  border: 1px solid rgba(129, 165, 223, .2);
  border-radius: 9px;
  background: rgba(14, 26, 45, .92);
  padding: 11px 13px;
  color: #dbe7fb;
  font-size: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, .2);
}

.floating-card span {
  color: #67a5ff;
  margin-right: 5px;
}

.floating-card-top {
  top: 42px;
  right: 15px;
}

.floating-card-bottom {
  bottom: 35px;
  left: 8px;
}

.hero-index {
  position: absolute;
  right: 25px;
  bottom: 18px;
  color: #657895;
  font-size: 9px;
  letter-spacing: 1.5px;
  font-weight: 800;
}

.section-heading, .recent-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-top: 43px;
  margin-bottom: 19px;
}

.section-heading h2, .recent-heading h2 {
  font-size: 24px;
  letter-spacing: -.8px;
  margin: 8px 0 5px;
}

.section-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.section-count {
  color: #8292ae;
  font-size: 9px;
  letter-spacing: 1.3px;
  padding-bottom: 6px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.category-card {
  position: relative;
  min-width: 0;
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  overflow: hidden;
  padding: 21px;
  border: 1px solid var(--border);
  border-radius: 17px;
  color: white;
  background:
    radial-gradient(ellipse at 100% 0%, rgba(65, 115, 200, .09), transparent 48%),
    #0d1421;
  transition: border-color .2s, transform .2s, background .2s;
}

.category-card:hover {
  border-color: rgba(90, 153, 255, .55);
  transform: translateY(-3px);
  background:
    radial-gradient(ellipse at 100% 0%, rgba(65, 115, 200, .16), transparent 48%),
    #101a2a;
}

.category-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-icon {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  border: 1px solid rgba(130, 159, 205, .15);
  border-radius: 13px;
  background: rgba(88, 124, 185, .09);
  font-size: 21px;
}

.category-arrow {
  color: #667993;
  font-size: 21px;
  transition: transform .2s, color .2s;
}

.category-card:hover .category-arrow {
  color: #77adff;
  transform: translate(2px, -2px);
}

.category-card-copy {
  margin-top: 22px;
  margin-bottom: 22px;
}

.category-card-copy h3 {
  margin: 0 0 8px;
  font-size: 17px;
  letter-spacing: -.35px;
}

.category-card-copy p {
  margin: 0;
  max-width: 350px;
  color: #8f9db3;
  font-size: 11px;
  line-height: 1.7;
}

.category-card-bottom {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: auto;
  color: #7184a2;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.category-line {
  width: 32px;
  height: 1px;
  background: #3b75c7;
  transition: width .2s;
}

.category-card:hover .category-line {
  width: 52px;
}

.category-wide {
  grid-column: 1 / -1;
  min-height: 145px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr;
}

.category-wide .category-card-top {
  grid-column: 1 / -1;
}

.category-wide .category-card-copy {
  margin-top: 15px;
  margin-bottom: 0;
}

.category-wide .category-card-bottom {
  grid-column: 2;
  grid-row: 2;
  align-self: end;
  margin-top: 0;
}

.recent-heading {
  margin-top: 47px;
}

.recent-heading h2 {
  margin-bottom: 0;
}

.text-button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #80b2ff;
  font-size: 11px;
  font-weight: 800;
}

/* CATEGORY FEEDS */

.section-page {
  padding-top: 30px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border: 0;
  color: #a4b3ca;
  background: transparent;
  font-size: 12px;
}

.back-button span {
  font-size: 18px;
  color: #76aaff;
}

.section-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 180px;
  padding: 27px;
  margin-top: 21px;
  border: 1px solid var(--border);
  border-top: 3px solid var(--blue);
  border-radius: 18px;
  background:
    radial-gradient(ellipse at 100% 0%, rgba(48, 109, 217, .13), transparent 55%),
    #0e1523;
}

.section-hero-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 18px;
  border: 1px solid rgba(120, 154, 212, .2);
  background: rgba(66, 107, 176, .1);
  font-size: 29px;
}

.section-hero-copy {
  flex: 1;
  min-width: 0;
}

.section-hero-copy h1 {
  margin: 10px 0 8px;
  font-size: clamp(25px, 3vw, 34px);
  letter-spacing: -1.2px;
}

.section-hero-copy p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.section-post-button {
  white-space: nowrap;
}

.feed-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 15px;
  margin: 35px 0 19px;
}

.feed-toolbar h2 {
  font-size: 19px;
  letter-spacing: -.4px;
  margin: 0 0 7px;
}

.feed-toolbar p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.feed-count {
  color: #8ea1be;
  font-size: 9px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 47px;
  padding: 0 14px;
  margin-bottom: 19px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: #0c1320;
}

.search-box > span {
  color: #7caeff;
  font-size: 25px;
}

.search-box input {
  flex: 1;
  width: 100%;
  border: 0;
  outline: 0;
  color: white;
  background: transparent;
  font-size: 12px;
}

.search-box input::placeholder {
  color: #6d7c94;
}

.search-box button {
  border: 0;
  background: transparent;
  color: #aebbd0;
  font-size: 22px;
}

/* POSTS */

.post-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.post-card {
  min-width: 0;
  padding: 19px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: linear-gradient(145deg, #101827, #0c1320);
}

.post-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.post-category {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
}

.save-button {
  width: 33px;
  height: 33px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #111c2d;
  color: #91a4c3;
  font-size: 19px;
}

.save-button.saved {
  color: #75aaff;
  border-color: rgba(67, 140, 255, .4);
}

.post-card h3 {
  margin: 14px 0 9px;
  font-size: 16px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.post-content {
  color: #9aa8bd;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  color: #9eacc1;
  font-size: 11px;
}

.post-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.meta-icon {
  color: #78aaff;
  font-size: 15px;
}

.post-price {
  color: #66d8ac;
  font-weight: 800;
}

.post-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 15px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
  color: #74839b;
  font-size: 10px;
}

.contact-button {
  color: #6de0b2;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
}

.contact-button:hover {
  text-decoration: underline;
}

.empty-panel, .notice-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 220px;
  padding: 32px 20px;
  border: 1px dashed rgba(128, 156, 203, .22);
  border-radius: 17px;
  background: rgba(13, 20, 33, .6);
}

.empty-icon {
  font-size: 29px;
  color: #6ba5ff;
  margin-bottom: 12px;
}

.empty-panel h3 {
  margin: 0 0 9px;
  font-size: 17px;
}

.empty-panel p {
  max-width: 380px;
  color: #91a0b7;
  font-size: 12px;
  line-height: 1.8;
  margin: 0 0 19px;
}

.empty-panel > .primary-button {
  margin-top: 5px;
}

.notice-panel {
  min-height: auto;
  color: #ffcc8b;
  font-size: 12px;
  line-height: 1.7;
}

.spinner {
  width: 25px;
  height: 25px;
  border: 2px solid #23334d;
  border-top-color: #5b9bff;
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin-bottom: 13px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* PROFILE */

.simple-page-heading {
  margin: 12px 0 27px;
}

.simple-page-heading h1 {
  margin: 12px 0 8px;
  font-size: 34px;
  letter-spacing: -1.2px;
}

.simple-page-heading p {
  color: var(--muted);
  font-size: 12px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 19px;
  padding: 25px;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: #0e1523;
}

.profile-avatar {
  width: 65px;
  height: 65px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: white;
  background: linear-gradient(145deg, #448dff, #194ca6);
  font-size: 28px;
  font-weight: 800;
}

.profile-details h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.profile-details p {
  margin: 0 0 12px;
  color: #94a4bc;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #78dcb4;
  font-size: 10px;
}

.profile-badge .live-dot {
  width: 6px;
  height: 6px;
}

.profile-menu {
  margin-top: 18px;
  border: 1px solid var(--border);
  border-radius: 15px;
  overflow: hidden;
  background: #0e1523;
}

.profile-menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  padding: 18px;
  color: white;
  border: 0;
  background: transparent;
}

.profile-menu button + button {
  border-top: 1px solid var(--border);
}

.profile-menu-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #14233a;
  color: #7daeff;
  font-size: 21px;
}

.profile-menu button > span:nth-child(2) {
  flex: 1;
  display: grid;
  gap: 5px;
}

.profile-menu strong {
  font-size: 12px;
}

.profile-menu small {
  color: #8f9eb4;
  font-size: 11px;
}

.profile-menu-arrow {
  color: #7baaff;
}

.logout-button {
  margin-top: 22px;
  padding: 13px 17px;
  border: 1px solid rgba(255, 108, 108, .25);
  border-radius: 10px;
  background: rgba(255, 91, 91, .07);
  color: #ff9c9c;
  font-size: 12px;
  font-weight: 800;
}

/* FIXED BOTTOM NAVIGATION */

.bottom-nav {
  position: fixed;
  z-index: 20;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: min(530px, calc(100% - 32px));
  min-height: 69px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 4px;
  padding: 7px 10px;
  border: 1px solid rgba(135, 166, 219, .19);
  border-radius: 19px;
  background: rgba(12, 19, 32, .94);
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
}

.nav-item {
  flex: 1;
  min-width: 0;
  min-height: 51px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 12px;
  color: #8795ad;
  background: transparent;
  font-size: 9px;
  font-weight: 700;
}

.nav-item.active {
  color: #78adff;
  background: rgba(63, 126, 226, .1);
}

.nav-icon {
  font-size: 22px;
  line-height: 1;
}

.nav-post {
  color: #eaf2ff;
}

.nav-post-icon {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  border-radius: 9px;
  color: white;
  background: linear-gradient(145deg, #5ba0ff, #286be1);
  font-size: 23px;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(55, 123, 244, .25);
}

/* POST MODAL */

.modal-backdrop {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 5, 11, .79);
  backdrop-filter: blur(7px);
}

.post-modal {
  width: min(570px, 100%);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  border: 1px solid rgba(128, 164, 223, .2);
  border-radius: 20px;
  background: #0e1523;
  box-shadow: 0 30px 90px rgba(0, 0, 0, .45);
  padding: 27px;
}

.modal-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 23px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--border);
}

.modal-heading h2 {
  margin: 10px 0 7px;
  font-size: 25px;
  letter-spacing: -.8px;
}

.modal-heading p {
  margin: 0;
  color: #8f9db3;
  font-size: 12px;
  line-height: 1.7;
}

.modal-close {
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: #c1cde0;
  background: #141e30;
  font-size: 23px;
}

.post-form {
  gap: 17px;
}

.post-form textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.7;
}

.post-form select {
  appearance: auto;
}

.required {
  color: #77adff;
}

.form-note {
  padding: 12px;
  border: 1px solid rgba(87, 147, 255, .18);
  border-radius: 9px;
  color: #9db9e8;
  background: rgba(67, 140, 255, .06);
  font-size: 11px;
  line-height: 1.7;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 7px;
}

.secondary-button {
  border: 1px solid #29374e;
  border-radius: 10px;
  padding: 12px 18px;
  color: #aab8cd;
  background: #111b2b;
  font-size: 12px;
  font-weight: 700;
}

/* RESPONSIVE */

@media (min-width: 1300px) {
  .app-content {
    width: calc(100% - 80px);
  }
}

@media (max-width: 850px) {
  .hero-art {
    right: -65px;
    opacity: .7;
  }

  .hero-copy {
    max-width: 75%;
  }

  .section-hero {
    flex-wrap: wrap;
  }

  .section-hero-copy {
    flex-basis: calc(100% - 90px);
  }

  .section-post-button {
    margin-left: 84px;
  }
}

@media (max-width: 650px) {
  .auth-page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 22px 17px;
    display: grid;
    place-items: center;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .auth-layout {
    display: flex;
    width: 100%;
    max-width: 430px;
    justify-content: center;
    align-items: center;
    margin: auto;
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 26px;
    font-size: 22px;
    font-weight: 800;
  }

  .auth-card {
    width: 100%;
    min-width: 0;
    padding: 25px 21px;
    border-radius: 20px;
  }

  .auth-card-heading h2 {
    font-size: 24px;
  }

  .topbar {
    height: 64px;
    padding: 0 17px;
  }

  .topbar .brand-lockup {
    font-size: 20px;
  }

  .topbar .brand-mark {
    width: 34px;
    height: 34px;
    font-size: 19px;
  }

  .topbar-campus {
    display: none;
  }

  .avatar-button {
    width: 35px;
    height: 35px;
  }

  .app-shell {
    padding-bottom: 105px;
  }

  .app-content {
    width: calc(100% - 30px);
  }

  .hero-panel {
    min-height: 285px;
    margin-top: 19px;
    padding: 27px 21px;
    border-radius: 18px;
  }

  .hero-copy {
    max-width: 100%;
  }

  .hero-copy h1 {
    font-size: 30px;
    letter-spacing: -1.5px;
    line-height: 1.18;
  }

  .hero-copy > p {
    max-width: 90%;
    font-size: 12px;
  }

  .hero-art {
    width: 155px;
    height: 155px;
    top: auto;
    bottom: 5px;
    right: -44px;
    opacity: .18;
  }

  .hero-symbol {
    width: 80px;
    height: 80px;
    border-radius: 23px;
    font-size: 49px;
  }

  .orbit-one {
    width: 150px;
    height: 100px;
  }

  .orbit-two {
    width: 175px;
    height: 130px;
  }

  .floating-card {
    display: none;
  }

  .hero-index {
    display: none;
  }

  .section-heading, .recent-heading {
    margin-top: 33px;
    margin-bottom: 17px;
  }

  .section-heading h2, .recent-heading h2 {
    font-size: 21px;
  }

  .section-heading p {
    font-size: 11px;
    line-height: 1.6;
  }

  .section-count {
    font-size: 8px;
    white-space: nowrap;
  }

  .category-grid {
    gap: 10px;
  }

  .category-card {
    min-height: 183px;
    padding: 14px;
    border-radius: 14px;
  }

  .category-icon {
    width: 37px;
    height: 37px;
    font-size: 18px;
    border-radius: 11px;
  }

  .category-arrow {
    font-size: 18px;
  }

  .category-card-copy {
    margin-top: 19px;
    margin-bottom: 18px;
  }

  .category-card-copy h3 {
    font-size: 14px;
    line-height: 1.4;
  }

  .category-card-copy p {
    font-size: 10px;
    line-height: 1.6;
  }

  .category-card-bottom {
    font-size: 7px;
    letter-spacing: 1px;
    gap: 7px;
  }

  .category-line {
    width: 18px;
  }

  .category-wide {
    min-height: 125px;
  }

  .category-wide .category-card-copy {
    margin-top: 13px;
  }

  .recent-heading {
    align-items: center;
    gap: 10px;
  }

  .text-button {
    max-width: 120px;
    text-align: right;
    justify-content: end;
    font-size: 10px;
  }

  .post-list {
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .post-card {
    padding: 16px;
  }

  .section-page {
    padding-top: 17px;
  }

  .section-hero {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 13px;
    padding: 19px 15px;
    margin-top: 13px;
    border-radius: 15px;
  }

  .section-hero-icon {
    width: 47px;
    height: 47px;
    border-radius: 12px;
    font-size: 23px;
  }

  .section-hero-copy {
    flex: initial;
    min-width: 0;
  }

  .section-hero-copy .section-kicker {
    font-size: 8px;
    letter-spacing: 1px;
  }

  .section-hero-copy h1 {
    margin: 8px 0 6px;
    font-size: 23px;
    letter-spacing: -.8px;
    overflow-wrap: anywhere;
  }

  .section-hero-copy p {
    font-size: 11px;
  }

  .section-post-button {
    grid-column: 1 / -1;
    margin: 5px 0 0;
    width: 100%;
  }

  .feed-toolbar {
    margin-top: 27px;
  }

  .feed-toolbar h2 {
    font-size: 17px;
  }

  .feed-toolbar p {
    font-size: 10px;
    line-height: 1.6;
  }

  .feed-count {
    font-size: 8px;
  }

  .search-box {
    min-height: 44px;
  }

  .bottom-nav {
    bottom: max(8px, env(safe-area-inset-bottom));
    width: calc(100% - 20px);
    min-height: 65px;
    padding: 6px 5px;
    border-radius: 17px;
  }

  .nav-item {
    min-height: 49px;
    font-size: 8px;
    gap: 4px;
  }

  .nav-icon {
    font-size: 20px;
  }

  .nav-post-icon {
    width: 27px;
    height: 27px;
    font-size: 21px;
  }

  .post-modal {
    padding: 20px 16px;
    border-radius: 16px;
  }

  .modal-heading h2 {
    font-size: 22px;
  }

  .modal-heading p {
    font-size: 11px;
  }

  .profile-card {
    padding: 18px;
    gap: 13px;
  }

  .profile-avatar {
    width: 53px;
    height: 53px;
    border-radius: 15px;
  }

  .profile-details h2 {
    font-size: 15px;
  }

  .profile-details p {
    font-size: 11px;
  }

  .simple-page-heading h1 {
    font-size: 29px;
  }
}

@media (max-width: 360px) {
  .app-content {
    width: calc(100% - 22px);
  }

  .auth-card {
    padding: 23px 17px;
  }

  .hero-panel {
    padding: 22px 15px;
  }

  .hero-copy h1 {
    font-size: 26px;
  }

  .category-card {
    padding: 11px;
  }

  .category-card-copy h3 {
    font-size: 12px;
  }

  .category-card-copy p {
    font-size: 9px;
  }

  .category-card-bottom {
    letter-spacing: .5px;
  }

  .section-heading h2, .recent-heading h2 {
    font-size: 19px;
  }

  .section-count {
    font-size: 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
`;