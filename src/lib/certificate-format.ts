/** How dates read on a certificate, e.g. "22 October 2026". */
export function formatCertificateDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Freetown",
  }).format(date);
}
