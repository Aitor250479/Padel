import ShareImageButton from "./ShareImageButton";

/** Comparte el cartel con el resultado de la encuesta por WhatsApp. */
export default function SharePollResultButton({ text }: { text: string }) {
  return (
    <ShareImageButton
      text={text}
      imageUrl="/admin/bienvenida/cartel-resultado"
      fileName="resultado-encuesta.png"
      label="Compartir el resultado por WhatsApp"
    />
  );
}
