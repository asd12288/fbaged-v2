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
`;

const NameCell = styled.td`
  cursor: pointer;
  color: var(--color-brand-600);
  font-weight: 600;

  &:hover {
    background: var(--color-grey-50);
  }
`;

export default function SimClientsTable({ clients, onEdit, onArchive, onOpen }) {
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
              <Action onClick={() => onEdit(c)}>Edit</Action>
              <Action onClick={() => onArchive(c.id)}>Archive</Action>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
