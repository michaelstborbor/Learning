/** The public verify page for a certificate, as printed in its QR code. */
export function verifyUrl(baseUrl: string, certificateNumber: string): string {
  return `${baseUrl}/verify?id=${encodeURIComponent(certificateNumber)}`;
}
