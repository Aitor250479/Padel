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

type ResultRow = {
  id: string;
  label: string;
  count: number;
  percent: number;
  winner: boolean;
};

/**
 * Cartel con el resultado de una encuesta cerrada (PNG) para compartir por
 * WhatsApp: la ganadora destacada y el resto debajo. Sin enlaces.
 */
export async function renderPollResultPoster(poll: Poll, rows: ResultRow[], total: number) {
  const [black, extra, banner] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-900-normal.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-800-normal.woff")),
    readFile(join(process.cwd(), "public/finencuesta.png")),
  ]);
  const bannerSrc = `data:image/png;base64,${banner.toString("base64")}`;
  const qSize = poll.question.length > 90 ? 40 : poll.question.length > 50 ? 48 : 56;
  const winners = rows.filter((r) => r.winner);
  const rest = rows.filter((r) => !r.winner).sort((a, b) => b.count - a.count);
  const tie = winners.length > 1;
  const winSize = tie ? 44 : 52;

  const bannerH = Math.round((W * 614) / 1200);
  // Estimación generosa del alto: mejor que sobre algo de rojo a que se corte.
  const qLines = Math.ceil(poll.question.length / (qSize === 56 ? 22 : qSize === 48 ? 26 : 32));
  const winLines = winners.reduce((n, r) => n + Math.ceil(r.label.length / (tie ? 30 : 26)), 0);
  const restLines = rest.reduce((n, r) => n + Math.ceil(r.label.length / 34), 0);
  const height =
    bannerH +
    30 +
    (qLines * qSize * 1.3 + 80) +
    (30 + 50 + 170 + winLines * winSize * 1.25 + 80) +
    rest.length * 60 +
    restLines * 50 +
    40 +
    (tie ? (winners.length - 1) * 40 : 0);

  return new ImageResponse(
    <div
      style={{
        width: W,
        height,
        display: "flex",
        flexDirection: "column",
        background: RED,
        fontFamily: "Nunito",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bannerSrc} width={W} height={bannerH} alt="" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "30px 44px 0",
        }}
      >
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 26,
            background: "#111",
            border: `8px solid ${LIME}`,
            borderRadius: 32,
            padding: "24px 30px 34px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 900,
              color: LIME,
              letterSpacing: 4,
            }}
          >
            {tie ? "EMPATE" : "GANADORA"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 900,
              color: LIME,
              lineHeight: 1.05,
            }}
          >
            {`${winners[0]?.percent ?? 0}%`}
          </div>
          {winners.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {i > 0 && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    fontWeight: 900,
                    color: LIME,
                  }}
                >
                  y
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: winSize,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: "#fff",
                  marginTop: 4,
                }}
              >
                {r.label}
              </div>
            </div>
          ))}
        </div>
        {rest.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              background: "#fff",
              border: "6px solid #111",
              borderRadius: 24,
              padding: "14px 28px",
              fontSize: 38,
              fontWeight: 800,
              color: "#111",
            }}
          >
            <div style={{ display: "flex", flex: 1, marginRight: 20 }}>{r.label}</div>
            <div style={{ display: "flex", flexShrink: 0, fontWeight: 900 }}>{`${r.percent}%`}</div>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 28,
            fontSize: 32,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {`${total} ${total === 1 ? "voto" : "votos"} · Torneo Pádel Loyola`}
        </div>
      </div>
    </div>,
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
