"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type View = "login" | "signup" | "forgot" | "check-email" | "reset-sent";

const COOLDOWN_SECONDS = 60;

function explainAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (text.includes("email not confirmed")) {
    return "Please confirm your email first. Enter the 6-digit code we sent you.";
  }
  if (text.includes("already registered")) {
    return "An account with this email already exists. Please log in instead.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many emails were sent. Please wait a while and try again.";
  }
  if (text.includes("password should") || text.includes("weak password")) {
    return "Your password is too weak. Use at least 8 characters with a capital letter, a small letter, a number and a symbol.";
  }
  if (text.includes("same as the old")) {
    return "Your new password must be different from the old one.";
  }
  if (text.includes("failed to fetch") || text.includes("network")) {
    return "Could not connect. Please check your internet and try again.";
  }
  if (text.includes("token") || text.includes("otp")) {
    return "That code is wrong or has expired. Please request a new code.";
  }
  return message || "Something went wrong. Please try again.";
}

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

const AU_STYLES = `
  .au-page {
    min-height: 100dvh;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    background: #080d18;
    color: #ffffff;
  }
  .au-card {
    width: 100%;
    max-width: 420px;
    box-sizing: border-box;
    background: #101827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px 20px;
  }
  .au-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; font-size: 1.2rem; font-weight: 700; }
  .au-mark { width: 40px; height: 40px; border-radius: 12px; background: #3984ff; display: flex; align-items: center; justify-content: center; font-weight: 800; }
  .au-blue { color: #72aaff; }
  .au-card h1 { margin: 0 0 6px; font-size: 1.5rem; }
  .au-sub { margin: 0 0 18px; opacity: 0.75; line-height: 1.5; }
  .au-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; min-width: 0; }
  .au-field label { font-size: 0.9rem; font-weight: 600; }
  .au-field input {
    width: 100%;
    box-sizing: border-box;
    background: #080d18;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 16px;
  }
  .au-field input:focus { outline: 2px solid #3984ff; border-color: #3984ff; }
  .au-pass { position: relative; }
  .au-pass input { padding-right: 70px; }
  .au-show {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: #72aaff;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 6px 8px;
  }
  .au-primary {
    width: 100%;
    box-sizing: border-box;
    border: none;
    border-radius: 12px;
    padding: 14px;
    background: #3984ff;
    color: #ffffff;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
  }
  .au-primary:disabled { opacity: 0.6; }
  .au-secondary {
    width: 100%;
    box-sizing: border-box;
    margin-top: 10px;
    background: transparent;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    padding: 12px;
    font-size: 1rem;
    cursor: pointer;
  }
  .au-secondary:disabled { opacity: 0.6; }
  .au-link { background: transparent; border: none; color: #72aaff; font-size: 0.9rem; cursor: pointer; padding: 4px 0; }
  .au-row { display: flex; justify-content: flex-end; margin: -6px 0 14px; }
  .au-switch { margin-top: 18px; text-align: center; font-size: 0.95rem; opacity: 0.9; }
  .au-switch .au-link { font-size: 0.95rem; font-weight: 700; margin-left: 6px; }
  .au-error { margin-bottom: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(229, 57, 53, 0.15); border: 1px solid #e53935; font-size: 0.9rem; line-height: 1.4; }
  .au-icon { font-size: 2.4rem; margin-bottom: 8px; }
  .au-foot { margin: 20px 0 0; text-align: center; font-size: 0.8rem; opacity: 0.55; }
`;

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className="au-pass">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button type="button" className="au-show" onClick={onToggle}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export default function AuthScreen({
  mode,
  onRecovered,
}: {
  mode: "main" | "recovery";
  onRecovered?: () => void;
}) {
  const [view, setView] = useState<View>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [code, setCode] = useState("");

  // An email link that has expired or was already used.
  useEffect(() => {
    if (mode !== "main") return;
    const hash = window.location.hash;
    if (hash.includes("error_code=otp_expired") || hash.includes("error=access_denied")) {
      setError(
        "That link has expired or was already used. Log in, or use Forgot password to get a new link."
      );
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [mode]);

  // Counts down the wait time before an email can be sent again.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function go(next: View) {
    setView(next);
    setError("");
    setPassword("");
    setConfirm("");
    setCode("");
    setShowPassword(false);
  }

  async function handleLogin() {
    if (!isEmail(email) || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (loginError) {
      // Account exists but the email was never confirmed: go to the code screen.
      if (loginError.message.toLowerCase().includes("email not confirmed")) {
        go("check-email");
        setError(
          "Your email is not confirmed yet. Enter the 6-digit code we sent you, or tap Resend code."
        );
        return;
      }
      setError(explainAuthError(loginError.message));
    }
  }

  async function handleSignup() {
    const name = fullName.trim();
    if (name.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (signupError) {
      setError(explainAuthError(signupError.message));
      return;
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Please log in instead.");
      return;
    }
    if (!data.session) {
      setCooldown(COOLDOWN_SECONDS);
      go("check-email");
    }
  }

  // Confirms the account with the 6-digit code from the email.
  async function verifyCode() {
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "signup",
    });
    setBusy(false);
    if (verifyError) setError(explainAuthError(verifyError.message));
  }

  async function resendConfirmation() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (resendError) {
      setError(explainAuthError(resendError.message));
      return;
    }
    setCooldown(COOLDOWN_SECONDS);
  }

  async function sendResetLink() {
    if (cooldown > 0 || busy) return;
    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    );
    setBusy(false);
    if (resetError) {
      setError(explainAuthError(resetError.message));
      return;
    }
    setCooldown(COOLDOWN_SECONDS);
    go("reset-sent");
  }

  async function handleRecovery() {
    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(explainAuthError(updateError.message));
      return;
    }
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    onRecovered?.();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (mode === "recovery") void handleRecovery();
    else if (view === "login") void handleLogin();
    else if (view === "signup") void handleSignup();
    else if (view === "forgot") void sendResetLink();
  }

  const brand = (
    <div className="au-brand">
      <div className="au-mark">F</div>
      <span>
        Futa<span className="au-blue">Hub</span>
      </span>
    </div>
  );

  // Choose a new password (after clicking the reset link).
  if (mode === "recovery") {
    return (
      <main className="au-page">
        <section className="au-card">
          {brand}
          <h1>Choose a new password</h1>
          <p className="au-sub">Enter a new password for your account.</p>

          <form onSubmit={onSubmit}>
            <PasswordInput
              id="au-new"
              label="New password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="Enter new password"
            />
            <PasswordInput
              id="au-new-confirm"
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="Enter it again"
            />
            {error && <div className="au-error">{error}</div>}
            <button className="au-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save new password"}
            </button>
          </form>
        </section>
        <style jsx global>{AU_STYLES}</style>
      </main>
    );
  }

  // Check your email (after creating an account): enter the 6-digit code.
  if (view === "check-email") {
    return (
      <main className="au-page">
        <section className="au-card">
          {brand}
          <div className="au-icon">✉️</div>
          <h1>Check your email</h1>
          <p className="au-sub">
            We sent a 6-digit code to <strong>{email.trim()}</strong>. Enter it
            below to confirm your account.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) void verifyCode();
            }}
          >
            <div className="au-field">
              <label htmlFor="au-code">Confirmation code</label>
              <input
                id="au-code"
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="Enter the code"
              />
            </div>
            {error && <div className="au-error">{error}</div>}
            <button className="au-primary" type="submit" disabled={busy}>
              {busy ? "Checking..." : "Confirm account"}
            </button>
          </form>
          <button
            className="au-secondary"
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void resendConfirmation()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <div className="au-switch">
            <button className="au-link" type="button" onClick={() => go("login")}>
              Back to log in
            </button>
          </div>
        </section>
        <style jsx global>{AU_STYLES}</style>
      </main>
    );
  }

  // Reset link sent.
  if (view === "reset-sent") {
    return (
      <main className="au-page">
        <section className="au-card">
          {brand}
          <div className="au-icon">✉️</div>
          <h1>Check your email</h1>
          <p className="au-sub">
            If an account exists for <strong>{email.trim()}</strong>, we sent a
            link to choose a new password. Open the link on this device. It works
            for a short time only.
          </p>
          {error && <div className="au-error">{error}</div>}
          <button
            className="au-primary"
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void sendResetLink()}
          >
            {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the link again"}
          </button>
          <button className="au-secondary" type="button" onClick={() => go("login")}>
            Back to log in
          </button>
        </section>
        <style jsx global>{AU_STYLES}</style>
      </main>
    );
  }

  // Forgot password.
  if (view === "forgot") {
    return (
      <main className="au-page">
        <section className="au-card">
          {brand}
          <h1>Forgot password</h1>
          <p className="au-sub">
            Enter your email and we will send you a link to choose a new password.
          </p>
          <form onSubmit={onSubmit}>
            <div className="au-field">
              <label htmlFor="au-forgot-email">Email address</label>
              <input
                id="au-forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="Enter email address"
              />
            </div>
            {error && <div className="au-error">{error}</div>}
            <button className="au-primary" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <div className="au-switch">
            <button className="au-link" type="button" onClick={() => go("login")}>
              Back to log in
            </button>
          </div>
        </section>
        <style jsx global>{AU_STYLES}</style>
      </main>
    );
  }

  // Create account.
  if (view === "signup") {
    return (
      <main className="au-page">
        <section className="au-card">
          {brand}
          <h1>Create account</h1>
          <p className="au-sub">Join your campus community on FutaHub.</p>
          <form onSubmit={onSubmit}>
            <div className="au-field">
              <label htmlFor="au-name">Full name</label>
              <input
                id="au-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Enter your full name"
                maxLength={80}
              />
            </div>
            <div className="au-field">
              <label htmlFor="au-email">Email address</label>
              <input
                id="au-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="Enter email address"
              />
            </div>
            <PasswordInput
              id="au-password"
              label="Password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <PasswordInput
              id="au-confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="Enter it again"
            />
            {error && <div className="au-error">{error}</div>}
            <button className="au-primary" type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create Account"}
            </button>
          </form>
          <div className="au-switch">
            Already have an account?
            <button className="au-link" type="button" onClick={() => go("login")}>
              Log in
            </button>
          </div>
          <p className="au-foot">A community space for FUTA students</p>
        </section>
        <style jsx global>{AU_STYLES}</style>
      </main>
    );
  }

  // Log in (the first screen).
  return (
    <main className="au-page">
      <section className="au-card">
        {brand}
        <h1>Welcome to FutaHub</h1>
        <p className="au-sub">Sign in to connect with your campus.</p>
        <form onSubmit={onSubmit}>
          <div className="au-field">
            <label htmlFor="au-login-email">Email address</label>
            <input
              id="au-login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="Enter email address"
            />
          </div>
          <PasswordInput
            id="au-login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            autoComplete="current-password"
            placeholder="Enter password"
          />
          <div className="au-row">
            <button className="au-link" type="button" onClick={() => go("forgot")}>
              Forgot password?
            </button>
          </div>
          {error && <div className="au-error">{error}</div>}
          <button className="au-primary" type="submit" disabled={busy}>
            {busy ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="au-switch">
          New to FutaHub?
          <button className="au-link" type="button" onClick={() => go("signup")}>
            Create account
          </button>
        </div>
        <p className="au-foot">A community space for FUTA students</p>
      </section>
      <style jsx global>{AU_STYLES}</style>
    </main>
  );
}