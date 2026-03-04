import React from "react";
import styled from "styled-components";
import toast from "react-hot-toast";

import Heading from "../ui/Heading";
import Spinner from "../ui/Spinner";
import { useUser } from "../features/auth/useUser";
import { useOptionalAdminScope } from "../features/admin/AdminScopeContext";
import { useLeadBatches } from "../features/leads/hooks/useLeadBatches";
import MyLeadsTable from "../features/leads/user/MyLeadsTable";
import { downloadLeadBatchCsv } from "../services/leadsApi";

const Notice = styled.p`
  margin-top: 1.2rem;
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

function MyLeads() {
  const { user } = useUser();
  const scope = useOptionalAdminScope();

  const isAdmin = user?.role === "admin";
  const selectedUserId = scope?.selectedUserId || null;

  const shouldLoad = !!user && (!isAdmin || !!selectedUserId);

  const { data: batches = [], isPending } = useLeadBatches({
    assignedUserId: isAdmin ? selectedUserId || undefined : undefined,
    enabled: shouldLoad,
  });

  async function handleDownload(batch) {
    try {
      await downloadLeadBatchCsv(batch.id, {
        filename: `${batch.source_filename.replace(/\.csv$/i, "")}-batch-${batch.id}.csv`,
      });
    } catch (error) {
      toast.error(error.message || "Could not download lead batch");
    }
  }

  return (
    <>
      <Heading>My Leads</Heading>

      {isAdmin && !selectedUserId ? (
        <Notice>Select a user from the sidebar to view lead imports.</Notice>
      ) : null}

      {isPending ? <Spinner /> : null}

      {!isPending && shouldLoad ? (
        <MyLeadsTable batches={batches} onDownload={handleDownload} />
      ) : null}
    </>
  );
}

export default MyLeads;
