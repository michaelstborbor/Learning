// Where supporters can send donations. Numbers are kept here once so the
// support page, copy buttons and WhatsApp link always agree.
export const MOBILE_MONEY = [
  { id: "orange", name: "Orange Money", number: "074604374" },
  { id: "afrimoney", name: "Afrimoney", number: "077939367" },
] as const;

// For supporters outside Sierra Leone, who can't use local mobile money.
export const WHATSAPP_NUMBER = "078604374";

// 074604374 -> "074 604 374", easier to read and check before sending.
export function formatLocalNumber(number: string) {
  return number.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}

// Local Sierra Leone number to international form for wa.me links:
// 078604374 -> 23278604374 (+232, without the leading 0).
export function toInternational(number: string) {
  return `232${number.replace(/^0/, "")}`;
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${toInternational(number)}?text=${encodeURIComponent(message)}`;
}
