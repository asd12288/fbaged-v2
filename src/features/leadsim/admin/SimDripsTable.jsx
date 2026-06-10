import styled from "styled-components";
import Spinner from "../../../ui/Spinner";
import { useSimDrips } from "../hooks/useSimDrips";
import SimDripStatusBadge from "./SimDripStatusBadge";
import SimDripProgressBar from "./SimDripProgressBar";

const Notice = styled.p`
  margin-top: 1.2rem;
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

const Wrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-0);
  width: 100%;
`;

const Table = styled.table`
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
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--color-grey-50);
  }
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

const NameButton = styled.button`
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

export default function SimDripsTable({ clientId, onOpenDrip }) {
  const { drips, isPending, error } = useSimDrips(clientId);

  if (!clientId) {
    return <Notice>Select a sim client to view its drips.</Notice>;
  }

  if (isPending) {
    return <Spinner />;
  }

  if (error) {
    return <Notice>Could not load drips: {error.message}</Notice>;
  }

  if (!drips.length) {
    return (
      <Notice>No drips yet for this client — upload a list above to create one.</Notice>
    );
  }

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <HeadCell>Name</HeadCell>
            <HeadCell>File</HeadCell>
            <HeadCell>Created</HeadCell>
            <HeadCell>Status</HeadCell>
            <HeadCell>Progress</HeadCell>
            <HeadCell>Daily volume</HeadCell>
            <HeadCell>Failed</HeadCell>
          </tr>
        </thead>
        <tbody>
          {drips.map((drip) => (
            <Tr key={drip.id} onClick={() => onOpenDrip?.(drip)}>
              <Td>
                <NameButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDrip?.(drip);
                  }}
                >
                  {drip.name}
                </NameButton>
              </Td>
              <Td>{drip.source_filename}</Td>
              <Td>{new Date(drip.created_at).toLocaleDateString()}</Td>
              <Td>
                <SimDripStatusBadge
                  status={drip.status}
                  pausedReason={drip.paused_reason}
                />
              </Td>
              <Td>
                <SimDripProgressBar
                  sent={drip.sent_count}
                  total={drip.total_count}
                  failed={drip.failed_count}
                />
              </Td>
              <Td>{drip.daily_volume}</Td>
              <Td>{drip.failed_count}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}
