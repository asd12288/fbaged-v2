import styled from "styled-components";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import SpinnerMini from "../../../ui/SpinnerMini";
import { estimateBusinessDays } from "../utils/pacing";

const Card = styled.div`
  margin-top: 2rem;
  padding: 1.6rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-50);
`;

const Title = styled.h4`
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: var(--color-brand-700);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.2rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Chip = styled.div`
  background: ${(props) => props.$bg || "var(--color-grey-0)"};
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  padding: 0.8rem 1rem;
  font-size: 1.2rem;
  color: ${(props) => props.$fg || "var(--color-grey-700)"};
`;

const ChipValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
`;

const SampleList = styled.ul`
  margin: 0.8rem 0 1.2rem;
  padding-left: 2rem;
  font-size: 1.2rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
  max-width: 32rem;

  label {
    font-size: 1.3rem;
    color: var(--color-grey-600);
  }
`;

const Helper = styled.p`
  margin: 0.4rem 0 0;
  font-size: 1.2rem;
  color: var(--color-grey-500);
`;

const ResultBox = styled.div`
  margin-top: 1.2rem;
  padding: 1rem 1.2rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-green-100);
  color: var(--color-green-700);
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const ViewDripButton = styled.button`
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 0.6rem 1.2rem;
  background: var(--color-green-700);
  color: var(--color-grey-0);
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--color-brand-700);
  }
`;

export default function SimDripPreviewCard({
  preview,
  dripName,
  onNameChange,
  dailyVolume,
  onVolumeChange,
  skipWeekends,
  onConfirm,
  isCreating,
  createResult,
  onViewDrip,
}) {
  if (!preview && !createResult) return null;

  const total = preview?.summary.totalRows;
  const valid = preview?.summary.validRows;
  const duplicate = preview?.summary.duplicateRows;
  const invalid = preview?.summary.invalidRows;
  const newCount = preview?.summary.newCount ?? 0;
  const samples = preview?.duplicateSamples || [];
  const days = estimateBusinessDays(newCount, dailyVolume);
  const dayWord = days === 1 ? "day" : "days";
  const dayLabel = skipWeekends ? `business ${dayWord}` : dayWord;

  return (
    <Card>
      {preview ? (
        <>
          <Title>Drip Preview</Title>
          <StatsGrid>
            <Chip>
              Total
              <ChipValue>{total}</ChipValue>
            </Chip>
            <Chip>
              Valid
              <ChipValue>{valid}</ChipValue>
            </Chip>
            <Chip $bg="var(--color-green-100)" $fg="var(--color-green-700)">
              New (will queue)
              <ChipValue>{newCount}</ChipValue>
            </Chip>
            <Chip $bg="var(--color-grey-100)" $fg="var(--color-grey-600)">
              Duplicate (skipped)
              <ChipValue>{duplicate}</ChipValue>
            </Chip>
            <Chip $bg="var(--color-red-100)" $fg="var(--color-red-700)">
              Invalid (skipped)
              <ChipValue>{invalid}</ChipValue>
            </Chip>
          </StatsGrid>

          {samples.length > 0 ? (
            <>
              <strong>Duplicate email samples (this client)</strong>
              <SampleList>
                {samples.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </SampleList>
            </>
          ) : null}

          <Field>
            <label htmlFor="drip-name">Drip name</label>
            <Input
              id="drip-name"
              value={dripName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </Field>

          <Field>
            <label htmlFor="drip-volume">Daily volume</label>
            <Input
              id="drip-volume"
              type="number"
              min={1}
              value={dailyVolume}
              onChange={(e) => onVolumeChange(Math.max(1, Number(e.target.value) || 1))}
            />
            <Helper>
              About {days} {dayLabel} to deliver {newCount} new leads at this pace.
            </Helper>
          </Field>

          <Button onClick={onConfirm} disabled={isCreating || newCount === 0}>
            {isCreating ? (
              <>
                <SpinnerMini /> Creating…
              </>
            ) : (
              "Create drip"
            )}
          </Button>
        </>
      ) : null}

      {createResult ? (
        <ResultBox>
          <span>
            Drip created: {createResult.queued_count} new leads queued, skipped{" "}
            {createResult.duplicate_rows} duplicates and {createResult.invalid_rows} invalid
            rows. Created as a draft — open it to start delivery.
          </span>
          {onViewDrip && createResult.drip_id ? (
            <ViewDripButton type="button" onClick={() => onViewDrip(createResult.drip_id)}>
              View drip →
            </ViewDripButton>
          ) : null}
        </ResultBox>
      ) : null}
    </Card>
  );
}
