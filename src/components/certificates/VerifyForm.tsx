"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface CertificateResult {
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  competencyStatement: string;
  issuingPartner: string | null;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
}

export function VerifyForm({ initialCertificateNumber }: { initialCertificateNumber?: string }) {
  const [certificateNumber, setCertificateNumber] = useState(initialCertificateNumber ?? "");
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function lookup(number: string) {
    setError(null);
    setResult(null);
    setSearching(true);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(number.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!initialCertificateNumber) return;
    // Deferred via a microtask rather than called directly: lookup()
    // calls setState as its first statements, and calling that
    // synchronously inside the effect body itself triggers React's
    // cascading-render warning. Queuing it lets the effect's own commit
    // finish first.
    queueMicrotask(() => {
      lookup(initialCertificateNumber);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await lookup(certificateNumber);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field
            id="certificateNumber"
            label="Certificate ID"
            placeholder="ESA-XXXXXXXX"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={searching || !certificateNumber.trim()}>
          {searching ? "Checking…" : "Verify"}
        </Button>
      </form>

      {error && <Alert tone="danger" title={error} />}

      {result && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold text-ink-900">
              {result.learnerName}
            </p>
            <Badge tone={result.status === "ACTIVE" ? "verified" : "danger"}>
              {result.status === "ACTIVE" ? "Valid certificate" : "Revoked"}
            </Badge>
          </div>
          <p className="text-sm text-ink-700">{result.courseTitle}</p>
          <p className="text-sm text-ink-500">{result.competencyStatement}</p>
          <div className="border-t border-ink-100 pt-3 text-xs text-ink-500">
            <p>Certificate ID: {result.certificateNumber}</p>
            <p>Issued: {new Date(result.issuedAt).toLocaleDateString()}</p>
            <p>
              Issuing body:{" "}
              {result.issuingPartner ? result.issuingPartner : "EcoSkills Academy"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
