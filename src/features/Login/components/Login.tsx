// app/login/components/Login.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, Target, Star, Sun, Rocket, ThumbsUp, Trophy,
  Flame, Lightbulb, Smile, Mountain, Crown, Heart, Medal,
  Lock, Eye, EyeOff, User, AlertCircle,
} from "lucide-react";
import { Quote } from "../types";
import { useLogin } from "../hooks/useLogin";

const USER_CODE_REGEX = /^[A-Z]{3}\d{3}$/;
const RECENT_LOGIN_CODES_KEY = "hms_recent_login_codes";
const REDIRECTING_KEY = "hms_forced_logout_redirecting";

const motivationalQuotes: Quote[] = [
  { text: "Dream big. Work hard. Stay humble.", icon: Star },
  { text: "Success doesn’t come from what you do occasionally, it comes from what you do consistently.", icon: Target },
  { text: "Believe you can, and you're halfway there.", icon: Rocket },
  { text: "Every day is a new chance to get better.", icon: Sun },
  { text: "Don’t watch the clock—do what it does. Keep going.", icon: Flame },
  { text: "Your only limit is your mind.", icon: Lightbulb },
  { text: "Discipline beats motivation every single time.", icon: Trophy },
  { text: "Push yourself, because no one else is going to do it for you.", icon: Mountain },
  { text: "Consistency is the key to mastery.", icon: Medal },
  { text: "Make today so good that yesterday gets jealous.", icon: Smile },
  { text: "Great things never come from comfort zones.", icon: Crown },
  { text: "Focus on progress, not perfection.", icon: ThumbsUp },
  { text: "Keep shining—your effort will speak louder than words.", icon: Sparkles },
  { text: "Hard work beats talent when talent doesn’t work hard.", icon: Heart },
];

function FieldMessage({
  id,
  tone,
  children,
}: {
  id: string;
  tone: "helper" | "error";
  children: string;
}) {
  return (
    <p
      id={id}
      className={`min-h-4 mt-1 text-[11px] leading-4 ${tone === "error" ? "text-destructive" : "text-muted-foreground"
        }`}
      aria-live="polite"
    >
      {children}
    </p>
  );
}

export function Login() {
  const searchParams = useSearchParams();
  const {
    userCode, name, designation, password, showPassword,
    isLoading, isFetchingInfo, lookupError, authError, setUserCode,
    setPassword, setShowPassword, verifyUserLogin,
  } = useLogin();

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<{ userCode: boolean; password: boolean }>({
    userCode: false,
    password: false,
  });
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_LOGIN_CODES_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(parsed)) {
        setRecentCodes(parsed.filter((code) => USER_CODE_REGEX.test(code)));
      }
    } catch {
      setRecentCodes([]);
    }
  }, []);

  const userCodeRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto-focus password field when user info is fetched
  useEffect(() => {
    if (name && designation && !isFetchingInfo) {
      passwordRef.current?.focus();
    }
  }, [name, designation, isFetchingInfo]);

  useEffect(() => {
    if (authError) passwordRef.current?.focus();
  }, [authError]);

  const trimmedUserCode = userCode.trim();
  const suggestedCodes = recentCodes
    .filter((code) =>
      trimmedUserCode ? code.startsWith(trimmedUserCode.toUpperCase()) : true
    )
    .slice(0, 4);
  const profileVerified =
    Boolean(name) &&
    Boolean(designation) &&
    !isFetchingInfo &&
    USER_CODE_REGEX.test(trimmedUserCode) &&
    !lookupError;
  const shouldShowUserCodeFeedback = touched.userCode || submitAttempted;
  const shouldShowPasswordFeedback = touched.password || submitAttempted || Boolean(authError);

  const userCodeError = (() => {
    if (!shouldShowUserCodeFeedback) return "";
    if (!trimmedUserCode) return "Enter your staff code.";
    if (!USER_CODE_REGEX.test(trimmedUserCode)) {
      return "Invalid format. Use 3 letters + 3 numbers (e.g., DOC001).";
    }
    if (lookupError) return lookupError;
    return "";
  })();

  const passwordError = (() => {
    if (!shouldShowPasswordFeedback) return "";
    if (!password.trim()) return "Enter your password.";
    if (authError) return authError;
    return "";
  })();

  const canSubmit =
    trimmedUserCode &&
    USER_CODE_REGEX.test(trimmedUserCode) &&
    !lookupError &&
    !isFetchingInfo &&
    Boolean(name) &&
    Boolean(designation) &&
    Boolean(password.trim());

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched({ userCode: true, password: true });

    if (!trimmedUserCode || !USER_CODE_REGEX.test(trimmedUserCode) || lookupError) {
      userCodeRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      passwordRef.current?.focus();
      return;
    }

    if (!canSubmit) {
      return;
    }

    verifyUserLogin();
  };

  const userCodeHint = userCodeError
    ? userCodeError
    : isFetchingInfo && trimmedUserCode && USER_CODE_REGEX.test(trimmedUserCode)
      ? "Looking up your profile…"
      : profileVerified
        ? ""
        : submitAttempted &&
          trimmedUserCode &&
          USER_CODE_REGEX.test(trimmedUserCode) &&
          !lookupError &&
          !isFetchingInfo &&
          (!name || !designation)
          ? "Verification pending. Please wait or re-check the code."
          : "Enter your staff code (e.g., DOC001).";

  const passwordHint = passwordError ? passwordError : "Use your account password.";
  const forceLogoutNotice = searchParams.get("reason") === "forced_logout";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(REDIRECTING_KEY);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background items-center justify-center p-4">
      <div className="flex w-full max-w-5xl min-h-[640px] lg:h-[640px] shadow-2xl rounded-lg overflow-hidden">
        {/* LEFT - LOGIN FORM */}
        <div className="flex flex-col w-full lg:w-1/2 bg-white p-6 lg:p-10 relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-md flex items-center justify-center shadow-xl border border-white/20">
              <img src="/logo_img.svg" alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-primary text-2xl leading-tight">
                Dr Fauzia Ishaq Clinic
              </h1>
              <p className="text-xs text-primary font-medium tracking-wide">CLINICAL EXCELLENCE</p>
            </div>
          </div>

          <h2 className="font-bold text-2xl text-foreground mb-1">Welcome Back!</h2>
          <p className="text-sm text-muted-foreground mb-3">Sign in to access your dashboard</p>
          {forceLogoutNotice ? (
            <div className="mb-3 rounded-xl border border-warning/40 bg-warning/15 px-3 py-2">
              <p className="text-xs font-semibold text-warning-foreground">
                You were signed out by an administrator. Please sign in again.
              </p>
            </div>
          ) : null}

          {/* Input fields */}
          <div className="flex flex-col gap-3 flex-1">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-userCode" className="block text-xs font-medium text-foreground">
                  User Code
                </label>
                {profileVerified && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/30">
                    Verified
                  </span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  id="login-userCode"
                  ref={userCodeRef}
                  type="text"
                  value={userCode}
                  list="login-userCode-suggestions"
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  onBlur={() => setTouched((prev) => ({ ...prev, userCode: true }))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                  placeholder="e.g., DOC001"
                  autoComplete="username"
                  aria-invalid={Boolean(userCodeError)}
                  aria-describedby="login-userCode-help"
                  className={`w-full h-11 px-4 pl-11 pr-11 text-foreground text-sm bg-muted border rounded-xl outline-none transition-colors focus:ring-2 ${userCodeError
                    ? "border-destructive/30 focus:ring-ring/20 focus:border-ring"
                    : "border-border focus:ring-ring/20 focus:border-ring"
                    }`}
                />
                <User
                  className={`absolute left-3.5 top-3.5 h-5 w-5 ${userCodeError ? "text-destructive" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                {Boolean(userCodeError) && !isFetchingInfo && (
                  <AlertCircle className="absolute right-3.5 top-3.5 h-5 w-5 text-destructive" aria-hidden="true" />
                )}
                {isFetchingInfo && !name && !userCodeError && (
                  <div className="absolute right-3.5 top-3.5">
                    <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <FieldMessage
                id="login-userCode-help"
                tone={userCodeError ? "error" : "helper"}
              >
                {userCodeHint}
              </FieldMessage>
              {suggestedCodes.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {suggestedCodes.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setUserCode(code);
                        setTouched((prev) => ({ ...prev, userCode: true }));
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/10"
                    >
                      {code}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem(RECENT_LOGIN_CODES_KEY);
                      }
                      setRecentCodes([]);
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-border bg-white text-muted-foreground hover:bg-muted"
                  >
                    Clear recent
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label htmlFor="login-name" className="block text-xs font-medium text-foreground">
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                value={name}
                readOnly
                tabIndex={-1}
                placeholder="Auto-filled after verification"
                autoComplete="off"
                className="w-full h-11 mt-1 px-4 text-foreground text-sm bg-muted border border-border rounded-xl cursor-default"
              />
            </div>

            <div>
              <label htmlFor="login-designation" className="block text-xs font-medium text-foreground">
                Designation
              </label>
              <input
                id="login-designation"
                type="text"
                value={designation}
                readOnly
                tabIndex={-1}
                placeholder="Auto-filled after verification"
                autoComplete="off"
                className="w-full h-11 mt-1 px-4 text-foreground text-sm bg-muted border border-border rounded-xl cursor-default"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      userCodeRef.current?.focus();
                    }
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby="login-password-help"
                  className={`w-full h-11 px-4 pl-11 pr-11 text-foreground text-sm bg-muted border rounded-xl outline-none transition-colors focus:ring-2 ${passwordError
                    ? "border-destructive/30 focus:ring-ring/20 focus:border-ring"
                    : "border-border focus:ring-ring/20 focus:border-ring"
                    }`}
                />
                <Lock
                  className={`absolute left-3.5 top-3.5 h-5 w-5 ${passwordError ? "text-destructive" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldMessage
                id="login-password-help"
                tone={passwordError ? "error" : "helper"}
              >
                {passwordHint}
              </FieldMessage>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || isFetchingInfo}
              className="w-full h-11 mt-2 text-primary-foreground font-semibold bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                isFetchingInfo ? "Verifying..." : "Sign In"
              )}
            </button>
            <datalist id="login-userCode-suggestions">
              {recentCodes.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </div>

          <div className="mt-auto pt-10">
            <p className="text-xs text-muted-foreground text-center">
              Developed by{" "}
              <span className="font-semibold text-primary">Muhammad Abdul Rehman</span>
            </p>
          </div>
        </div>

        {/* RIGHT - QUOTES */}
        <div className="hidden lg:flex w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-48 translate-y-48" />

          <div className="relative z-10 text-center">
            <div className="mb-8 flex justify-center">
              <div className="h-40 w-40 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center shadow-2xl animate-float border border-white/30">
                <img src="/logo_img.svg" alt="Big Logo" className="h-28 w-28 object-contain drop-shadow-2xl" />
              </div>
            </div>

            <h1 key={currentQuoteIndex} className="text-4xl font-bold text-white mb-4 animate-fade-in">
              {motivationalQuotes[currentQuoteIndex].text}
            </h1>

            <p className="text-white/90 text-lg font-light">
              Let your login be the start of something great today
            </p>

            <div className="flex gap-2 justify-center mt-8">
              {motivationalQuotes.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${i === currentQuoteIndex ? "w-8 bg-white" : "w-2 bg-white/40"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
