import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";

import Spinner from "../../../ui/Spinner";
import SpinnerMini from "../../../ui/SpinnerMini";
import { useSimDrip } from "../hooks/useSimDrip";
import { useSimDripLeads } from "../hooks/useSimDripLeads";
import { useSimDripControls } from "../hooks/useSimDripControls";
import SimDripStatusBadge from "./SimDripStatusBadge";
import SimDripProgressBar from "./SimDripProgressBar";
import SimDryRunBanner from "./SimDryRunBanner";

const LEAD_FILTERS = [
  { value: null, label: "All" },
  { value: "queued", label: "Queued" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

const LEADS_PAGE_SIZE = 100;

const Wrap = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const BackButton = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-brand-600);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const DripName = styled.h3`
  margin: 0;
  font-size: 2rem;
  color: var(--color-grey-800);
`;

const HeaderMeta = styled.span`
  font-size: 1.3rem;
  color: var(--color-grey-500);
`;

const PausedNotice = styled.div`
  padding: 1.2rem 1.6rem;
  border-radius: var(--border-radius-md);
  font-size: 1.3rem;
  font-weight: 500;
  background: ${(props) =>
    props.$breaker ? "var(--color-red-100)" : "var(--color-yellow-100)"};
  color: ${(props) =>
    props.$breaker ? "var(--color-red-700)" : "var(--color-yellow-700)"};
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1.6rem;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 1.3rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-brand-600);
  color: var(--color-grey-0);

  &:hover:not(:disabled) {
    background: var(--color-brand-700);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostButton = styled(ActionButton)`
  background: var(--color-grey-200);
  color: var(--color-grey-700);

  &:hover:not(:disabled) {
    background: var(--color-grey-300);
  }
`;

const DangerButton = styled(ActionButton)`
  background: var(--color-red-100);
  color: var(--color-red-700);

  &:hover:not(:disabled) {
    background: var(--color-red-700);
    color: var(--color-grey-0);
  }
`;

const ConfirmBox = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.6rem 1rem;
  border: 1px solid var(--color-red-100);
  border-radius: var(--border-radius-sm);
  font-size: 1.3rem;
  color: var(--color-red-700);
`;

const PaceWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-left: auto;

  label {
    font-size: 1.3rem;
    color: var(--color-grey-600);
  }
`;

const PaceInput = styled.input`
  width: 8rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  font-size: 1.3rem;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.2rem;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  padding: 1.2rem 1.6rem;
  border: 1px solid
    ${(props) => (props.$alert ? "var(--color-red-100)" : "var(--color-grey-200)")};
  border-radius: var(--border-radius-md);
  background: ${(props) =>
    props.$alert ? "var(--color-red-100)" : "var(--color-grey-0)"};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => (props.$alert ? "var(--color-red-700)" : "var(--color-grey-800)")};
`;

const StatLabel = styled.div`
  font-size: 1.2rem;
  color: ${(props) => (props.$alert ? "var(--color-red-700)" : "var(--color-grey-500)")};
`;

const LeadsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--color-grey-100);
  background: var(--color-grey-0);
  border-radius: var(--border-radius-sm);
  padding: 0.4rem;
`;

const FilterChip = styled.button`
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 0.4rem 1rem;
  font-size: 1.2rem;
  font-weight: 500;
  cursor: pointer;
  background: ${(props) =>
    props.$active ? "var(--color-brand-600)" : "var(--color-grey-0)"};
  color: ${(props) =>
    props.$active ? "var(--color-brand-50)" : "var(--color-grey-600)"};

  &:hover {
    background: ${(props) =>
      props.$active ? "var(--color-brand-600)" : "var(--color-grey-100)"};
  }
`;

const TimezoneNote = styled.span`
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-0);
  width: 100%;
`;

const LeadsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const HeadCell = styled.th`
  text-align: left;
  padding: 1rem;
  font-size: 1.2rem;
  color: var(--color-grey-600);
  border-bottom: 1px solid var(--color-grey-200);
  background: var(--color-grey-50);
`;

const Tr = styled.tr`
  border-bottom: 1px solid var(--color-grey-200);
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

const ResponseText = styled.span`
  font-size: 1.2rem;
  color: var(--color-grey-600);
`;

const RetryButton = styled.button`
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 0.4rem 1rem;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-grey-200);
  color: var(--color-grey-700);

  &:hover:not(:disabled) {
    background: var(--color-grey-300);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Notice = styled.p`
  margin: 0;
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

const PagerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
`;

const PagerLabel = styled.span`
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const ErrorNotice = styled.p`
  margin: 0;
  font-size: 1.4rem;
  color: var(--color-red-700);
`;

function formatInClientTz(value, timeZone) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // Invalid client timezone string — fall back to the browser's zone.
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function truncate(text, max = 48) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function SimDripDetail({ dripId, onBack }) {
  const { drip, client, counts, isPending, error } = useSimDrip(dripId);
  const [statusFilter, setStatusFilter] = useState(null);
  const [leadsOffset, setLeadsOffset] = useState(0);
  const {
    leads,
    total,
    isPending: isLoadingLeads,
    error: leadsError,
  } = useSimDripLeads(dripId, { status: statusFilter, offset: leadsOffset });
  const {
    start,
    pause,
    resume,
    cancel,
    setPace,
    retryLead,
    runDelivery,
    isChangingStatus,
    isSettingPace,
    isRetrying,
    isRunningDelivery,
  } = useSimDripControls(dripId);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [paceDraft, setPaceDraft] = useState(null);

  async function handleAction(action, successMessage) {
    try {
      await action();
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(err.message || "Action failed");
      return false;
    }
  }

  if (isPending) {
    return (
      <Wrap>
        <BackButton type="button" onClick={onBack}>
          ← All drips
        </BackButton>
        <Spinner />
      </Wrap>
    );
  }

  if (error) {
    return (
      <Wrap>
        <BackButton type="button" onClick={onBack}>
          ← All drips
        </BackButton>
        <ErrorNotice>Could not load drip: {error.message}</ErrorNotice>
      </Wrap>
    );
  }

  if (!drip) {
    return (
      <Wrap>
        <BackButton type="button" onClick={onBack}>
          ← All drips
        </BackButton>
        <Notice>Drip not found.</Notice>
      </Wrap>
    );
  }

  const isBreakerPause = (drip.paused_reason || "").startsWith("Circuit breaker");
  const canCancel = ["draft", "running", "paused"].includes(drip.status);
  const paceValue = paceDraft ?? String(drip.daily_volume);
  const paceNumber = Number(paceValue);
  const paceIsValid = Number.isFinite(paceNumber) && paceNumber >= 1;
  const paceChanged = paceIsValid && paceNumber !== drip.daily_volume;
  const failedCount = counts?.failed ?? 0;
  const failedAlert = failedCount > 0;
  const createdLabel = new Date(drip.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function handleSavePace() {
    const ok = await handleAction(
      () => setPace(Math.max(1, Math.round(paceNumber))),
      "Daily volume updated"
    );
    if (ok) setPaceDraft(null);
  }

  async function handleCancel() {
    setConfirmingCancel(false);
    await handleAction(cancel, "Drip canceled");
  }

  return (
    <Wrap>
      <BackButton type="button" onClick={onBack}>
        ← All drips
      </BackButton>

      <HeaderRow>
        <DripName>{drip.name}</DripName>
        <SimDripStatusBadge status={drip.status} pausedReason={drip.paused_reason} />
        <HeaderMeta>
          {client?.name} · created {createdLabel}
          {drip.source_filename ? ` · ${drip.source_filename}` : ""}
        </HeaderMeta>
      </HeaderRow>

      <SimDripProgressBar
        sent={drip.sent_count}
        total={drip.total_count}
        failed={drip.failed_count}
      />

      <SimDryRunBanner />

      {drip.status === "paused" && drip.paused_reason ? (
        <PausedNotice $breaker={isBreakerPause}>{drip.paused_reason}</PausedNotice>
      ) : null}

      <ControlsRow>
        {drip.status === "draft" ? (
          <ActionButton
            type="button"
            disabled={isChangingStatus}
            onClick={() => handleAction(start, "Drip started")}
          >
            {isChangingStatus ? <SpinnerMini /> : null} Start drip
          </ActionButton>
        ) : null}

        {drip.status === "running" ? (
          <>
            <GhostButton
              type="button"
              disabled={isChangingStatus}
              onClick={() => handleAction(pause, "Drip paused")}
            >
              Pause
            </GhostButton>
            <ActionButton
              type="button"
              disabled={isRunningDelivery}
              onClick={() => handleAction(runDelivery, "Delivery cycle triggered")}
            >
              {isRunningDelivery ? <SpinnerMini /> : null} Run delivery now
            </ActionButton>
          </>
        ) : null}

        {drip.status === "paused" ? (
          <ActionButton
            type="button"
            disabled={isChangingStatus}
            onClick={() => handleAction(resume, "Drip resumed")}
          >
            {isChangingStatus ? <SpinnerMini /> : null} Resume
          </ActionButton>
        ) : null}

        {canCancel ? (
          confirmingCancel ? (
            <ConfirmBox>
              Cancel this drip? Remaining leads will not be sent.
              <DangerButton
                type="button"
                disabled={isChangingStatus}
                onClick={handleCancel}
              >
                Yes, cancel drip
              </DangerButton>
              <GhostButton type="button" onClick={() => setConfirmingCancel(false)}>
                Keep drip
              </GhostButton>
            </ConfirmBox>
          ) : (
            <DangerButton
              type="button"
              disabled={isChangingStatus}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel drip
            </DangerButton>
          )
        ) : null}

        {canCancel ? (
          <PaceWrap>
            <label htmlFor="drip-pace">Daily volume</label>
            <PaceInput
              id="drip-pace"
              type="number"
              min={1}
              value={paceValue}
              onChange={(e) => setPaceDraft(e.target.value)}
            />
            <GhostButton
              type="button"
              disabled={!paceChanged || isSettingPace}
              onClick={handleSavePace}
            >
              {isSettingPace ? "Saving…" : "Save"}
            </GhostButton>
          </PaceWrap>
        ) : null}
      </ControlsRow>

      <StatGrid>
        <StatCard>
          <StatValue>{counts?.queued ?? 0}</StatValue>
          <StatLabel>Queued</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{counts?.scheduled ?? 0}</StatValue>
          <StatLabel>Scheduled</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{counts?.sent ?? 0}</StatValue>
          <StatLabel>Sent</StatLabel>
        </StatCard>
        <StatCard $alert={failedAlert}>
          <StatValue $alert={failedAlert}>{failedCount}</StatValue>
          <StatLabel $alert={failedAlert}>Failed</StatLabel>
        </StatCard>
      </StatGrid>

      <LeadsHeader>
        <FilterBar>
          {LEAD_FILTERS.map((filter) => (
            <FilterChip
              key={filter.label}
              type="button"
              $active={statusFilter === filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setLeadsOffset(0);
              }}
            >
              {filter.label}
            </FilterChip>
          ))}
        </FilterBar>
        <TimezoneNote>
          {total} {total === 1 ? "lead" : "leads"}
          {client?.timezone ? ` · times in ${client.timezone}` : ""}
        </TimezoneNote>
      </LeadsHeader>

      {leadsError ? (
        <ErrorNotice>Could not load leads: {leadsError.message}</ErrorNotice>
      ) : isLoadingLeads ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <Notice>
          No leads
          {statusFilter ? ` with status “${statusFilter}”` : ""} for this drip.
        </Notice>
      ) : (
        <>
          <TableWrapper>
            <LeadsTable>
              <thead>
                <tr>
                  <HeadCell>Email</HeadCell>
                  <HeadCell>Status</HeadCell>
                  <HeadCell>Scheduled for</HeadCell>
                  <HeadCell>Sent at</HeadCell>
                  <HeadCell>Attempts</HeadCell>
                  <HeadCell>Response</HeadCell>
                  <HeadCell></HeadCell>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const responseDetail = lead.response_body || lead.error;
                  return (
                    <Tr key={lead.id}>
                      <Td>{lead.email}</Td>
                      <Td>
                        <SimDripStatusBadge status={lead.status} />
                      </Td>
                      <Td>{formatInClientTz(lead.scheduled_at, client?.timezone)}</Td>
                      <Td>{formatInClientTz(lead.sent_at, client?.timezone)}</Td>
                      <Td>{lead.attempts}</Td>
                      <Td>
                        {lead.response_status != null || responseDetail ? (
                          <ResponseText
                            title={
                              [lead.error, lead.response_body]
                                .filter(Boolean)
                                .join("\n") || undefined
                            }
                          >
                            {lead.response_status != null
                              ? `HTTP ${lead.response_status}`
                              : null}
                            {lead.response_status != null && responseDetail
                              ? " · "
                              : null}
                            {truncate(responseDetail)}
                          </ResponseText>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        {lead.status === "failed" &&
                        ["running", "paused"].includes(drip.status) ? (
                          <RetryButton
                            type="button"
                            disabled={isRetrying}
                            onClick={() =>
                              handleAction(
                                () => retryLead(lead.id),
                                "Lead requeued for delivery"
                              )
                            }
                          >
                            {isRetrying ? "Retrying…" : "Retry"}
                          </RetryButton>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </LeadsTable>
          </TableWrapper>

          {total > LEADS_PAGE_SIZE ? (
            <PagerRow>
              <GhostButton
                type="button"
                disabled={leadsOffset === 0}
                onClick={() =>
                  setLeadsOffset(Math.max(0, leadsOffset - LEADS_PAGE_SIZE))
                }
              >
                ← Prev
              </GhostButton>
              <PagerLabel>
                Showing {leadsOffset + 1}–{Math.min(leadsOffset + LEADS_PAGE_SIZE, total)}{" "}
                of {total}
              </PagerLabel>
              <GhostButton
                type="button"
                disabled={leadsOffset + LEADS_PAGE_SIZE >= total}
                onClick={() => setLeadsOffset(leadsOffset + LEADS_PAGE_SIZE)}
              >
                Next →
              </GhostButton>
            </PagerRow>
          ) : null}
        </>
      )}
    </Wrap>
  );
}
