import styled from "styled-components";

const STATUS_STYLES = {
  // Drip statuses
  draft: { bg: "var(--color-grey-200)", fg: "var(--color-grey-700)", label: "Draft" },
  running: { bg: "var(--color-brand-600)", fg: "var(--color-grey-0)", label: "Running" },
  paused: { bg: "var(--color-red-100)", fg: "var(--color-red-700)", label: "Paused" },
  completed: { bg: "var(--color-green-100)", fg: "var(--color-green-700)", label: "Completed" },
  canceled: { bg: "var(--color-silver-100)", fg: "var(--color-silver-700)", label: "Canceled" },
  // Lead statuses
  queued: { bg: "var(--color-grey-200)", fg: "var(--color-grey-700)", label: "Queued" },
  scheduled: { bg: "var(--color-blue-100)", fg: "var(--color-blue-700)", label: "Scheduled" },
  sending: { bg: "var(--color-indigo-100)", fg: "var(--color-indigo-700)", label: "Sending" },
  sent: { bg: "var(--color-green-100)", fg: "var(--color-green-700)", label: "Sent" },
  failed: { bg: "var(--color-red-100)", fg: "var(--color-red-700)", label: "Failed" },
  skipped_duplicate: {
    bg: "var(--color-silver-100)",
    fg: "var(--color-silver-700)",
    label: "Skipped duplicate",
  },
};

const Pill = styled.span`
  display: inline-block;
  padding: 0.3rem 0.9rem;
  border-radius: 100px;
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${(props) => props.$bg};
  color: ${(props) => props.$fg};
`;

export default function SimDripStatusBadge({ status, pausedReason }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <Pill $bg={style.bg} $fg={style.fg} title={pausedReason || undefined}>
      {style.label}
    </Pill>
  );
}
