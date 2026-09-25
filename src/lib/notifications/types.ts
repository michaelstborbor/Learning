export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  /** Returns a provider message id on success, or null if the send did
   * not happen (including "not configured" — see ResendProvider). Never
   * throws for a routine failure; callers should treat email as
   * best-effort, not load-bearing for the request it's part of. */
  send(message: EmailMessage): Promise<{ id: string } | null>;
}
