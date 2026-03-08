import styled from "styled-components";
import toast from "react-hot-toast";

import Spinner from "../../../ui/Spinner";
import Button from "../../../ui/Button";
import { useAdminScope } from "../../admin/AdminScopeContext";
import { useLeadBatches } from "../hooks/useLeadBatches";
import {
  downloadDuplicateLeadsCsv,
  downloadLeadBatchCsv,
  downloadStoredLeadFile,
  getLeadBatchDuplicateRows,
} from "../../../services/leadsApi";

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
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

function getFilenameBase(sourceFilename) {
  return String(sourceFilename || "leads").replace(/\.csv$/i, "");
}

function AdminLeadImportsTable() {
  const { selectedUserId } = useAdminScope();

  const { data: batches = [], isPending } = useLeadBatches({
    assignedUserId: selectedUserId || undefined,
    enabled: !!selectedUserId,
  });

  if (!selectedUserId) {
    return <Notice>Select a user from the sidebar to view lead imports.</Notice>;
  }

  if (isPending) {
    return <Spinner />;
  }

  if (!batches.length) {
    return <Notice>No lead imports found yet.</Notice>;
  }

  async function handleDownloadNew(batch) {
    try {
      const base = getFilenameBase(batch.source_filename);
      const campaignName =
        batch?.campaign?.campaignName || `Campaign #${batch.campaign_id}`;
      if (batch.clean_file_path) {
        await downloadStoredLeadFile({
          path: batch.clean_file_path,
          filename: `${base}-batch-${batch.id}.csv`,
          campaignName,
        });
      } else {
        await downloadLeadBatchCsv(batch.id, {
          filename: `${base}-batch-${batch.id}.csv`,
          campaignName,
        });
      }
    } catch (error) {
      toast.error(error.message || "Could not download new leads file");
    }
  }

  async function handleDownloadDuplicates(batch) {
    if (!batch.duplicate_rows) {
      toast.error("No duplicate leads for this batch");
      return;
    }

    try {
      const base = getFilenameBase(batch.source_filename);
      const campaignName =
        batch?.campaign?.campaignName || `Campaign #${batch.campaign_id}`;
      if (batch.duplicate_file_path) {
        await downloadStoredLeadFile({
          path: batch.duplicate_file_path,
          filename: `${base}-duplicates-batch-${batch.id}.csv`,
          campaignName,
          includeReason: true,
        });
      } else {
        const rows = await getLeadBatchDuplicateRows(batch.id);
        if (!rows.length) {
          toast.error("No duplicate leads for this batch");
          return;
        }

        downloadDuplicateLeadsCsv(rows, {
          filename: `${base}-duplicates-batch-${batch.id}.csv`,
          campaignName,
        });
      }
    } catch (error) {
      toast.error(error.message || "Could not download duplicate leads file");
    }
  }

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <HeadCell>Import Date</HeadCell>
            <HeadCell>Campaign</HeadCell>
            <HeadCell>File</HeadCell>
            <HeadCell>Inserted</HeadCell>
            <HeadCell>Duplicates</HeadCell>
            <HeadCell>Invalid</HeadCell>
            <HeadCell>Actions</HeadCell>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => {
            const importDate = new Date(batch.created_at).toLocaleDateString();
            const campaignName =
              batch?.campaign?.campaignName || `Campaign #${batch.campaign_id}`;

            return (
              <Tr key={batch.id}>
                <Td>{importDate}</Td>
                <Td>{campaignName}</Td>
                <Td>{batch.source_filename}</Td>
                <Td>{batch.inserted_rows}</Td>
                <Td>{batch.duplicate_rows}</Td>
                <Td>{batch.invalid_rows}</Td>
                <Td>
                  <Button size="small" onClick={() => handleDownloadNew(batch)}>
                    Download New Leads
                  </Button>
                  <Button
                    size="small"
                    variation="secondary"
                    disabled={!batch.duplicate_rows}
                    onClick={() => handleDownloadDuplicates(batch)}
                  >
                    Download Duplicate Leads
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </Wrapper>
  );
}

export default AdminLeadImportsTable;
