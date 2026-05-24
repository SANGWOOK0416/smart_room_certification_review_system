import { useEffect } from "react";

const RESTORED_APP_URL = "http://127.0.0.1:4174/";

export default function App() {
  useEffect(() => {
    window.location.replace(RESTORED_APP_URL);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f3f6fb",
        fontFamily: "Pretendard, system-ui, sans-serif"
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          padding: "24px",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)"
        }}
      >
        <strong style={{ display: "block", marginBottom: "8px", fontSize: "20px" }}>
          복구된 앱으로 이동 중
        </strong>
        <p style={{ margin: 0, color: "#5b667a", lineHeight: 1.5 }}>
          잠시 후 실제 앱으로 자동 이동합니다.
        </p>
        <a
          href={RESTORED_APP_URL}
          style={{
            display: "inline-block",
            marginTop: "16px",
            color: "#1d4ed8",
            fontWeight: 700,
            textDecoration: "none"
          }}
        >
          바로 열기
        </a>
      </div>
    </main>
  );
}
