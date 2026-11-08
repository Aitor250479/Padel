import ShareImageButton from "./ShareImageButton";

/** Comparte el cartel de la encuesta actual por WhatsApp. */
export default function SharePollButton({ text }: { text: string }) {
  return (
    <ShareImageButton
      text={text}
      imageUrl="/admin/bienvenida/cartel"
      fileName="encuesta.png"
      label="Compartir la encuesta por WhatsApp"
    />
  );
}
