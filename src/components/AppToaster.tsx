"use client";

import toast, { ToastBar, Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ zIndex: 2147483647 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(255, 255, 255, 0.95)",
          color: "#0f172a",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 18px 45px rgba(2, 6, 23, 0.14)",
          borderRadius: "16px",
          padding: "12px 12px",
          backdropFilter: "blur(14px)",
          maxWidth: "420px",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#ecfdf5",
          },
        },
        error: {
          duration: 6000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fef2f2",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center gap-3">
              <div className="shrink-0">{icon}</div>
              <div className="min-w-0 flex-1 text-sm font-semibold">{message}</div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

