import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const W = 1080;
const RED = "#c8102e";
const LIME = "#a3e635";

/** Cartel de invitación (PNG): la imagen de "¡Únete a la liga!" y el enlace. */
export async function renderInvitePoster(host: string) {
  const [black, extra, banner] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-900-normal.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/nunito-latin-800-normal.woff")),
    readFile(join(process.cwd(), "public/invitacion.png")),
  ]);
  const bannerSrc = `data:image/png;base64,${banner.toString("base64")}`;
  const bannerW = W - 40;
  const bannerH = Math.round((bannerW * 388) / 1200);
  const height = 20 + bannerH + 30 + 210 + 30 + 110 + 26 + 60;

  return new ImageResponse(
    (
      <div style={{ width: W, height, display: "flex", flexDirection: "column", background: RED, fontFamily: "Nunito" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bannerSrc} width={bannerW} height={bannerH} alt="" style={{ margin: "20px 20px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "30px 44px 0" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              background: "#fff8e7",
              border: "8px solid #111",
              borderRadius: 32,
              padding: "22px 28px",
              color: "#111",
            }}
          >
            <div style={{ display: "flex", fontSize: 54, fontWeight: 900 }}>Crea tu usuario en un minuto</div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, marginTop: 8 }}>
              Marca cuándo puedes jugar y el sorteo hace el resto
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 30,
              background: LIME,
              border: "6px solid #111",
              borderRadius: 999,
              padding: "16px 20px",
              fontSize: 44,
              fontWeight: 900,
              color: "#111",
            }}
          >
            {`${host}/unete`}
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
            Torneo Pádel Loyola · ¡Te esperamos en la pista!
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height,
      fonts: [
        { name: "Nunito", data: black, weight: 900, style: "normal" },
        { name: "Nunito", data: extra, weight: 800, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
