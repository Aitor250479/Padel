import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatBooking } from "@/lib/matches";
import type { Poll, PollOption } from "@/lib/polls";

const W = 1080;
const RED = "#c8102e";
const LIME = "#a3e635";

/** Cartel de una encuesta (PNG) para compartir por WhatsApp. */
export async function renderPollPoster(poll: Poll, options: PollOption[], host: string) {
  const [black, extra, banner] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-900-normal.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-800-normal.woff")),
    readFile(join(process.cwd(), "public/inicioencuesta.png")),
  ]);
  const bannerSrc = `data:image/png;base64,${banner.toString("base64")}`;
  const qSize = poll.question.length > 90 ? 40 : poll.question.length > 50 ? 48 : 56;

  const bannerH = Math.round((W * 614) / 1200);
  // Estimación generosa del alto: mejor que sobre algo de rojo a que se corte.
  const qLines = Math.ceil(poll.question.length / (qSize === 56 ? 22 : qSize === 48 ? 26 : 32));
  const optLines = options.reduce((n, o) => n + Math.ceil(o.label.length / 32), 0);
  const height =
    bannerH + 30 + (qLines * qSize * 1.3 + 80) + options.length * 70 + optLines * 50 + 30 + 100 + 90;

  return new ImageResponse(
    (
      <div style={{ width: W, height, display: "flex", flexDirection: "column", background: RED, fontFamily: "Nunito" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bannerSrc} width={W} height={bannerH} alt="" />
        <div style={{ display: "flex", flexDirection: "column", padding: "30px 44px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              textAlign: "center",
              background: "#fff8e7",
              border: "8px solid #111",
              borderRadius: 32,
              padding: "24px 28px",
              fontSize: qSize,
              fontWeight: 900,
              lineHeight: 1.2,
              color: "#111",
            }}
          >
            {poll.question}
          </div>
          {options.map((o, i) => (
            <div
              key={o.id}
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 20,
                background: "#fff",
                border: "6px solid #111",
                borderRadius: 24,
                padding: "14px 22px",
                fontSize: 38,
                fontWeight: 800,
                color: "#111",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minWidth: 56,
                  padding: "0 8px",
                  flexShrink: 0,
                  marginRight: 20,
                  background: LIME,
                  border: "4px solid #111",
                  borderRadius: 14,
                  fontWeight: 900,
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: "flex", flex: 1 }}>{o.label}</div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 30,
              background: LIME,
              border: "6px solid #111",
              borderRadius: 999,
              padding: "14px 20px",
              fontSize: 38,
              fontWeight: 900,
              color: "#111",
            }}
          >
            {`Cierra el ${formatBooking(poll.closes_at)}`}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 26,
              fontSize: 30,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {`Torneo Pádel Loyola · Vota en ${host}`}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: Math.round(height),
      fonts: [
        { name: "Nunito", data: black, weight: 900, style: "normal" },
        { name: "Nunito", data: extra, weight: 800, style: "normal" },
      ],
      headers: { "Cache-Control": "no-store" },
    },
  );
}
