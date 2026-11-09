import ShareImageButton from "./ShareImageButton";

/** Comparte el cartel con el resultado de una encuesta cerrada por WhatsApp. */
export default function SharePollResultButton({ text, pollId }: { text: string; pollId: string }) {
  return (
    <ShareImageButton
      text={text}
      imageUrl={`/admin/bienvenida/cartel-resultado?id=${encodeURIComponent(pollId)}`}
      fileName="resultado-encuesta.png"
      label="Compartir el resultado por WhatsApp"
    />
  );
}
