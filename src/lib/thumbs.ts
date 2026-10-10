const cardImage = /^\/uploads\/anime_cards\/([\w-]+)\.(png|jpe?g|webp)$/i;

export const CARD_THUMB_WIDTH = 360;

export function cardThumb(src?: string | null) {
  if (!src) return "";
  const match = src.split("?")[0].match(cardImage);
  return match ? `/uploads/anime_cards/thumbs/${match[1]}.webp` : src;
}
