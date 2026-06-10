import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("u");
  const title = handle ? `what @${handle} probably sees` : "a feed built from a vibe";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#faf6f0",
          color: "#211d19",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 36, color: "#c2552b" }}>their feed.</div>
        <div style={{ fontSize: 72, marginTop: 24, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 28, marginTop: 32, color: "#6f6659" }}>
          a simulated timeline of real posts — no login, no tracking
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
