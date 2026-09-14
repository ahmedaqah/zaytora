// Wax-seal/monogram initials (WaxSealEnvelopeCover, EnvelopeMediaCover) are
// always rendered in a Latin script style ("D & A"), but a couple's name is
// just as often entered in Arabic -- taking name?.[0] then showed the raw
// Arabic letter sitting inside an otherwise-Latin engraved monogram. This
// maps each Arabic letter to the single Latin letter it's conventionally
// transliterated as (first letter only, e.g. "ش" -> "Sh" -> "S"), so the
// seal always reads as a proper Latin initial no matter which script the
// guest typed the name in.
const ARABIC_TO_LATIN_INITIAL: Record<string, string> = {
  ا: "A",
  أ: "A",
  إ: "A",
  آ: "A",
  ب: "B",
  ت: "T",
  ث: "T",
  ج: "J",
  ح: "H",
  خ: "K",
  د: "D",
  ذ: "D",
  ر: "R",
  ز: "Z",
  س: "S",
  ش: "S",
  ص: "S",
  ض: "D",
  ط: "T",
  ظ: "Z",
  ع: "A",
  غ: "G",
  ف: "F",
  ق: "Q",
  ك: "K",
  ل: "L",
  م: "M",
  ن: "N",
  ه: "H",
  ة: "T",
  و: "W",
  ي: "Y",
  ى: "A",
};

export function toLatinInitial(name?: string | null): string {
  const firstChar = name?.trim()?.[0];
  if (!firstChar) return "";
  return ARABIC_TO_LATIN_INITIAL[firstChar] ?? firstChar.toUpperCase();
}
