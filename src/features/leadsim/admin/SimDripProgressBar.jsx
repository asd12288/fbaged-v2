import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 12rem;
`;

const Track = styled.div`
  height: 0.8rem;
  border-radius: 100px;
  background: var(--color-grey-200);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${(props) => props.$pct}%;
  background: var(--color-brand-600);
`;

const Label = styled.span`
  font-size: 1.1rem;
  color: var(--color-grey-600);
`;

const Failed = styled.span`
  font-size: 1.1rem;
  color: var(--color-red-700);
`;

export default function SimDripProgressBar({ sent = 0, total = 0, failed = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
  return (
    <Wrap>
      <Track>
        <Fill $pct={pct} />
      </Track>
      <Label>
        {sent}/{total} sent
        {failed > 0 ? <Failed> · {failed} failed</Failed> : null}
      </Label>
    </Wrap>
  );
}
