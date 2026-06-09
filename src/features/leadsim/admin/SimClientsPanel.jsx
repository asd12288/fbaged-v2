import { useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { useSimClients } from "../hooks/useSimClients";
import { useSimClientMutations } from "../hooks/useSimClientMutations";
import SimClientsTable from "./SimClientsTable";
import SimClientForm from "./SimClientForm";

const Bar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.4rem;
`;
const NewButton = styled.button`
  padding: 0.8rem 1.6rem;
  border-radius: var(--border-radius-sm);
  border: none;
  cursor: pointer;
  background: var(--color-brand-600);
  color: white;
`;

export default function SimClientsPanel({ onOpenClient }) {
  const { clients, isPending, error } = useSimClients();
  const { saveClient, isSaving, archiveClient } = useSimClientMutations();
  const [editing, setEditing] = useState(null); // null=list, {}=new, {client}=edit

  if (isPending) return <p>Loading clients…</p>;
  if (error) return <p>Could not load clients: {error.message}</p>;

  async function handleSave(values) {
    try {
      await saveClient(values);
      toast.success("Client saved");
      setEditing(null);
    } catch (e) {
      toast.error(e.message || "Could not save client");
    }
  }

  async function handleArchive(id) {
    try {
      await archiveClient(id);
      toast.success("Client archived");
    } catch (e) {
      toast.error(e.message || "Could not archive client");
    }
  }

  if (editing !== null) {
    return (
      <SimClientForm
        client={editing.id ? editing : null}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <>
      <Bar>
        <h3>Sim clients</h3>
        <NewButton onClick={() => setEditing({})}>+ New client</NewButton>
      </Bar>
      <SimClientsTable
        clients={clients}
        onEdit={(c) => setEditing(c)}
        onArchive={handleArchive}
        onOpen={onOpenClient}
      />
    </>
  );
}
