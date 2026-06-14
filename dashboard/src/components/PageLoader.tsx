"use client";

import { useEffect, useState } from "react";

export default function PageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide loader after page has fully hydrated and painted
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e1b4b 100%)",
        transition: "opacity 0.4s ease",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "all" : "none",
      }}
    >
      {/* Logo / Brand Mark */}
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 32px rgba(99,102,241,0.5)",
          }}
        >
          {/* WhatsApp-style chat bubble icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
              fill="white"
              fillOpacity="0.9"
            />
            <path
              d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.5px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          WhatsACP
        </span>
      </div>

      {/* Spinner Ring */}
      <div style={{ position: "relative", width: 56, height: 56, marginBottom: "1.5rem" }}>
        {/* Outer track */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.15)",
          }}
        />
        {/* Spinning arc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#6366f1",
            borderRightColor: "#8b5cf6",
            animation: "whatsacp-spin 0.9s linear infinite",
          }}
        />
        {/* Inner dot */}
        <div
          style={{
            position: "absolute",
            inset: "16px",
            borderRadius: "50%",
            background: "rgba(139,92,246,0.25)",
            animation: "whatsacp-pulse 1.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Status text */}
      <p
        style={{
          color: "rgba(199,210,254,0.7)",
          fontSize: 13,
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          animation: "whatsacp-fade 1.8s ease-in-out infinite",
        }}
      >
        Loading dashboard…
      </p>

      {/* CSS Keyframes via style tag */}
      <style>{`
        @keyframes whatsacp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes whatsacp-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes whatsacp-fade {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
