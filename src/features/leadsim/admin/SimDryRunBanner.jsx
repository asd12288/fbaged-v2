import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";

import { useSimSettings } from "../hooks/useSimSettings";
import { useSimSetDryRun } from "../hooks/useSimSetDryRun";

const Banner = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.6rem;
  flex-wrap: wrap;
  padding: 1.2rem 1.6rem;
  border-radius: var(--border-radius-md);
  background: var(--color-yellow-100);
  color: var(--color-yellow-700);
  font-size: 1.3rem;
  font-weight: 500;
  margin-bottom: 1.6rem;
`;

const LiveBanner = styled(Banner)`
  padding: 0.8rem 1.6rem;
  background: var(--color-green-100);
  color: var(--color-green-700);
`;

const MutedBanner = styled(Banner)`
  padding: 0.8rem 1.6rem;
  background: var(--color-grey-100);
  color: var(--color-grey-500);
`;

const ErrorBanner = styled(Banner)`
  padding: 0.8rem 1.6rem;
  background: var(--color-red-100);
  color: var(--color-red-700);
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const ModeButton = styled.button`
  border: 1px solid currentColor;
  border-radius: var(--border-radius-sm);
  padding: 0.5rem 1.2rem;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: inherit;

  &:hover:not(:disabled) {
    background: var(--color-grey-0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default function SimDryRunBanner() {
  const { dryRun, isPending, error } = useSimSettings();
  const { setDryRun, isSettingDryRun } = useSimSetDryRun();
  const [confirmingLive, setConfirmingLive] = useState(false);

  async function switchMode(nextDryRun, successMessage) {
    try {
      await setDryRun({ dryRun: nextDryRun });
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message || "Could not switch delivery mode");
    } finally {
      setConfirmingLive(false);
    }
  }

  if (isPending) {
    return <MutedBanner>Checking delivery mode…</MutedBanner>;
  }

  if (error) {
    return <ErrorBanner>Could not load delivery mode: {error.message}</ErrorBanner>;
  }

  if (dryRun) {
    return (
      <Banner>
        <span>
          🧪 Dry-run mode — deliveries are simulated, nothing is sent to client CRMs
        </span>
        <Actions>
          {confirmingLive ? (
            <>
              <span>Live mode sends real requests to client CRMs. Switch?</span>
              <ModeButton
                type="button"
                disabled={isSettingDryRun}
                onClick={() => switchMode(false, "Live delivery enabled")}
              >
                {isSettingDryRun ? "Switching…" : "Yes, go live"}
              </ModeButton>
              <ModeButton
                type="button"
                disabled={isSettingDryRun}
                onClick={() => setConfirmingLive(false)}
              >
                Stay in dry-run
              </ModeButton>
            </>
          ) : (
            <ModeButton type="button" onClick={() => setConfirmingLive(true)}>
              Switch to live
            </ModeButton>
          )}
        </Actions>
      </Banner>
    );
  }

  return (
    <LiveBanner>
      <span>Live delivery is ON — requests are sent to client CRMs</span>
      <ModeButton
        type="button"
        disabled={isSettingDryRun}
        onClick={() => switchMode(true, "Dry-run mode enabled")}
      >
        {isSettingDryRun ? "Switching…" : "Switch to dry-run"}
      </ModeButton>
    </LiveBanner>
  );
}
