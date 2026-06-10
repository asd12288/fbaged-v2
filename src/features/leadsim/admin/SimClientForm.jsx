import { useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { buildDeliveryPayload, redactedPayload } from "../lib/payload";

const CANONICAL_FIELDS = ["full_name", "email", "tel", "answer", "date", "campaign"];

// Pinned sample lead for the live payload preview.
const SAMPLE_LEAD = {
  email: "jane@example.com",
  payload_json: {
    canonical: { full_name: "Jane Doe", tel: "+33600000000" },
  },
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  max-width: 60rem;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 16rem 1fr;
  align-items: center;
  gap: 1.2rem;
`;
const Label = styled.label`
  font-weight: 600;
`;
const Input = styled.input`
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
`;
const Actions = styled.div`
  display: flex;
  gap: 1.2rem;
`;
const Button = styled.button`
  padding: 0.8rem 1.6rem;
  border-radius: var(--border-radius-sm);
  border: none;
  cursor: pointer;
  background: var(--color-brand-600);
  color: white;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const Ghost = styled(Button)`
  background: var(--color-grey-200);
  color: var(--color-grey-700);
`;

const PreviewCard = styled.div`
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-50);
  padding: 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const PreviewTitle = styled.h4`
  margin: 0;
  font-size: 1.4rem;
  color: var(--color-brand-700);
`;

const PreviewMeta = styled.p`
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const PreviewBlock = styled.pre`
  margin: 0;
  padding: 1rem 1.2rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  background: var(--color-grey-0);
  font-family: "Menlo", "Consolas", monospace;
  font-size: 1.15rem;
  color: var(--color-grey-700);
  white-space: pre-wrap;
  word-break: break-all;
`;

const PreviewHint = styled.p`
  margin: 0;
  font-size: 1.15rem;
  color: var(--color-grey-500);
`;

function mappingFromClient(client) {
  const fields = client?.field_mapping?.fields || {};
  return CANONICAL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: fields[f] || "" }), {});
}

export default function SimClientForm({ client, onSave, onCancel, isSaving }) {
  const [name, setName] = useState(client?.name || "");
  const [webhookUrl, setWebhookUrl] = useState(client?.webhook_url || "");
  const [contentType, setContentType] = useState(
    client?.content_type || "application/json"
  );
  const [dailyVolume, setDailyVolume] = useState(client?.default_daily_volume || 25);
  const [timezone, setTimezone] = useState(client?.timezone || "Europe/Paris");
  const [windowStart, setWindowStart] = useState(client?.send_window_start || "08:00");
  const [windowEnd, setWindowEnd] = useState(client?.send_window_end || "21:00");
  const [skipWeekends, setSkipWeekends] = useState(client?.skip_weekends || false);
  const [authSecret, setAuthSecret] = useState("");
  const [mapping, setMapping] = useState(mappingFromClient(client));

  const payloadPreview = useMemo(() => {
    const fields = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v && v.trim())
    );
    // Typed secret wins; otherwise stand in for the stored one so the
    // preview shows where it will be placed (always masked below).
    const effectiveSecret =
      authSecret.trim() || (client?.auth_secret_ref ? "stored-secret" : null);
    const payload = buildDeliveryPayload({
      email: SAMPLE_LEAD.email,
      payload_json: SAMPLE_LEAD.payload_json,
      webhook_url: webhookUrl || "https://example-crm.test/leads",
      http_method: client?.http_method || "POST",
      content_type: contentType,
      field_mapping: { fields, constants: client?.field_mapping?.constants || {} },
      custom_headers: client?.custom_headers || null,
      auth_secret: effectiveSecret,
    });
    return redactedPayload(payload, effectiveSecret);
  }, [mapping, authSecret, client, webhookUrl, contentType]);

  const previewIsForm = contentType === "application/x-www-form-urlencoded";
  const previewBodyIsEmpty = Object.keys(payloadPreview.body).length === 0;
  const previewBody = previewBodyIsEmpty
    ? "(empty body — add field mappings above to populate it)"
    : previewIsForm
      ? new URLSearchParams(payloadPreview.body).toString()
      : JSON.stringify(payloadPreview.body, null, 2);
  const previewHeaders = Object.entries(payloadPreview.headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");

  function handleSubmit(e) {
    e.preventDefault();
    if (windowStart >= windowEnd) {
      toast.error("Send window start must be before end");
      return;
    }
    const fields = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v && v.trim())
    );
    // Preserve mapping keys managed outside this form (non-canonical fields).
    for (const [key, value] of Object.entries(client?.field_mapping?.fields || {})) {
      if (!CANONICAL_FIELDS.includes(key)) fields[key] = value;
    }
    onSave({
      id: client?.id || null,
      name,
      webhookUrl,
      httpMethod: client?.http_method ?? "POST",
      contentType,
      customHeaders: client?.custom_headers ?? {},
      timezone,
      sendWindowStart: windowStart,
      sendWindowEnd: windowEnd,
      skipWeekends,
      defaultDailyVolume: Math.max(1, Number(dailyVolume) || 25),
      fieldMapping: { fields, constants: client?.field_mapping?.constants || {} },
      authSecret: authSecret.trim() ? authSecret.trim() : null,
    });
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Label htmlFor="sim-client-name">Name</Label>
        <Input
          id="sim-client-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Row>
      <Row>
        <Label htmlFor="sim-client-webhook-url">Webhook URL</Label>
        <Input
          id="sim-client-webhook-url"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          required
        />
      </Row>
      <Row>
        <Label htmlFor="sim-client-content-type">Content type</Label>
        <select
          id="sim-client-content-type"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
        >
          <option value="application/json">JSON</option>
          <option value="application/x-www-form-urlencoded">Form-encoded</option>
        </select>
      </Row>
      <Row>
        <Label htmlFor="sim-client-auth-secret">Auth secret</Label>
        <Input
          id="sim-client-auth-secret"
          type="password"
          placeholder={client?.auth_secret_ref ? "•••••• (leave blank to keep)" : "token"}
          value={authSecret}
          onChange={(e) => setAuthSecret(e.target.value)}
        />
      </Row>
      <Row>
        <Label htmlFor="sim-client-daily-volume">Daily volume</Label>
        <Input
          id="sim-client-daily-volume"
          type="number"
          min="1"
          value={dailyVolume}
          onChange={(e) => setDailyVolume(e.target.value)}
        />
      </Row>
      <Row>
        <Label htmlFor="sim-client-timezone">Timezone</Label>
        <Input
          id="sim-client-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </Row>
      <Row>
        <Label htmlFor="sim-client-window-start">Send window</Label>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <Input
            id="sim-client-window-start"
            type="time"
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
          />
          <label htmlFor="sim-client-window-end">to</label>
          <Input
            id="sim-client-window-end"
            type="time"
            value={windowEnd}
            onChange={(e) => setWindowEnd(e.target.value)}
          />
        </div>
      </Row>
      <Row>
        <Label htmlFor="sim-client-skip-weekends">Skip weekends</Label>
        <input
          id="sim-client-skip-weekends"
          type="checkbox"
          checked={skipWeekends}
          onChange={(e) => setSkipWeekends(e.target.checked)}
        />
      </Row>

      <Label as="span">Field mapping (our field → their CRM key)</Label>
      {CANONICAL_FIELDS.map((field) => (
        <Row key={field}>
          <Label htmlFor={`sim-client-map-${field}`}>{field}</Label>
          <Input
            id={`sim-client-map-${field}`}
            placeholder={`their key for ${field}`}
            value={mapping[field]}
            onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
          />
        </Row>
      ))}

      <PreviewCard>
        <PreviewTitle>Payload preview</PreviewTitle>
        <PreviewMeta>
          Sample lead: Jane Doe · jane@example.com · +33600000000
        </PreviewMeta>
        <PreviewBlock>{`${payloadPreview.method} ${payloadPreview.url}`}</PreviewBlock>
        <PreviewBlock>{previewHeaders}</PreviewBlock>
        <PreviewBlock>{previewBody}</PreviewBlock>
        <PreviewHint>
          {
            "Header values may use {{secret}} to place the stored secret; otherwise it is sent as Authorization: Bearer <secret>."
          }
        </PreviewHint>
      </PreviewCard>

      <Actions>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save client"}
        </Button>
        {onCancel && (
          <Ghost type="button" onClick={onCancel}>
            Cancel
          </Ghost>
        )}
      </Actions>
    </Form>
  );
}
