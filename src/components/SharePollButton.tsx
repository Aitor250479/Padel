import ShareImageButton from "./ShareImageButton";

/** Comparte el cartel de una encuesta abierta por WhatsApp. */
export default function SharePollButton({ text, pollId }: { text: string; pollId: string }) {
  return (
    <ShareImageButton
      text={text}
      imageUrl={`/admin/bienvenida/cartel?id=${encodeURIComponent(pollId)}`}
      fileName="encuesta.png"
      label="Compartir la encuesta por WhatsApp"
    />
  );
}
