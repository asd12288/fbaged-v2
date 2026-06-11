import { useState } from "react";
import styled from "styled-components";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { text-align: left; padding: 1.2rem; border-bottom: 1px solid var(--color-grey-200); }
`;
const Action = styled.button`
  background: none;
  border: none;
  color: var(--color-brand-600);
  cursor: pointer;
  margin-right: 1.2rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DangerAction = styled(Action)`
  color: var(--color-red-700);
`;

const ConfirmBox = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--color-red-100);
  border-radius: var(--border-radius-sm);
  font-size: 1.3rem;
  color: var(--color-red-700);
`;

const NameCell = styled.td`
  cursor: pointer;
  color: var(--color-brand-600);
  font-weight: 600;

  &:hover {
    background: var(--color-grey-50);
  }
`;

export default function SimClientsTable({
  clients,
  onEdit,
  onArchive,
  onOpen,
  isArchiving,
}) {
  const [confirmingId, setConfirmingId] = useState(null);

  if (!clients.length) return <p>No clients yet. Create one to get started.</p>;
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Webhook</th>
          <th>Daily volume</th>
          <th>Window</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr key={c.id}>
            <NameCell onClick={() => onOpen?.(c)}>{c.name}</NameCell>
            <td>{c.webhook_url}</td>
            <td>{c.default_daily_volume}</td>
            <td>{c.send_window_start}–{c.send_window_end} ({c.timezone})</td>
            <td>
              {confirmingId === c.id ? (
                <ConfirmBox>
                  Archive this client?
                  <DangerAction
                    type="button"
                    disabled={isArchiving}
                    onClick={() => {
                      setConfirmingId(null);
                      onArchive(c.id);
                    }}
                  >
                    Yes, archive
                  </DangerAction>
                  <Action
                    type="button"
                    disabled={isArchiving}
                    onClick={() => setConfirmingId(null)}
                  >
                    Keep client
                  </Action>
                </ConfirmBox>
              ) : (
                <>
                  <Action type="button" disabled={isArchiving} onClick={() => onEdit(c)}>
                    Edit
                  </Action>
                  <Action
                    type="button"
                    disabled={isArchiving}
                    onClick={() => setConfirmingId(c.id)}
                  >
                    Archive
                  </Action>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
