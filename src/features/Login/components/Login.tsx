// app/login/components/Login.tsx
"use client";
import { useState, useEffect } from "react";
import {
  Sparkles, Target, Star, Sun, Rocket, ThumbsUp, Trophy,
  Flame, Lightbulb, Smile, Mountain, Crown, Heart, Medal,
  Lock, Eye, EyeOff, User, Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { Quote } from "../types";
import { useLogin } from "../hooks/useLogin";

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
export function Login() {
  const {
    userCode, name, designation, password, showPassword,
    isLoading, isFetchingInfo, error, setUserCode, setName, setDesignation,
    setPassword, setShowPassword, getUserData, verifyUserLogin,
  } = useLogin();

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const CurrentIcon = motivationalQuotes[currentQuoteIndex].icon;
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 items-center justify-center p-4">
      <div className="flex w-full max-w-5xl h-[600px] shadow-2xl rounded-3xl overflow-hidden">
        {/* LEFT - LOGIN FORM */}
        <div className="flex flex-col w-full lg:w-1/2 bg-white p-8 lg:p-12 relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
              <img src="/logo_img.svg" alt="Logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-emerald-800 text-3xl leading-tight">
                Dr Fauzia Ishaq Clinic
              </h1>
              <p className="text-xs text-emerald-600 font-medium tracking-wide">CLINICAL EXCELLENCE</p>
            </div>
          </div>

          <h2 className="font-bold text-3xl text-gray-800 mb-2">Welcome Back!</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to access your dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Input fields */}
          <div className="flex flex-col gap-4 flex-1">
            <div className="relative">
              <input
                type="text"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                placeholder="User Code (e.g., DOC001)"
                autoComplete="off"
                className="w-full h-12 px-4 pl-11 text-gray-700 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <User className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              {isFetchingInfo && !name && (
                <div className="absolute right-3.5 top-3.5">
                  <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              disabled={!userCode}
              autoComplete="off"
              className="w-full h-12 px-4 text-gray-700 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-50"
            />

            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Designation"
              disabled={!userCode}
              autoComplete="off"
              className="w-full h-12 px-4 text-gray-700 text-sm bg-gray-50 border border-gray-200 rounded-xl disabled:opacity-50"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyUserLogin()}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full h-12 px-4 pl-11 pr-11 text-gray-700 text-sm bg-gray-50 border border-gray-200 rounded-xl"
              />
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              onClick={verifyUserLogin}
              disabled={isLoading}
              className="w-full h-12 mt-2 text-white font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Developed by <span className="font-semibold text-emerald-600">Muhammad Abdul Rehman</span>
          </p>
        </div>

        {/* RIGHT - QUOTES */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-48 translate-y-48" />

          <div className="relative z-10 text-center">
            <div className="mb-8 flex justify-center">
              <div className="h-40 w-40 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl animate-float border border-white/30">
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
