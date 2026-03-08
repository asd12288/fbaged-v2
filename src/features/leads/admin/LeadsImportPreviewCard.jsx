import styled from "styled-components";
import toast from "react-hot-toast";
import Button from "../../../ui/Button";
import {
  downloadDuplicateLeadsCsv,
  downloadLeadBatchCsv,
  downloadStoredLeadFile,
} from "../../../services/leadsApi";

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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1.2rem;
`;

const StatItem = styled.div`
  background: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-sm);
  padding: 0.8rem 1rem;
  font-size: 1.3rem;
`;

const SampleList = styled.ul`
  margin: 0.8rem 0 1.2rem;
  padding-left: 2rem;
  font-size: 1.2rem;
`;

const ResultBox = styled.div`
  margin-top: 1.2rem;
  padding: 1rem 1.2rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-green-100);
  color: var(--color-green-700);
  font-size: 1.3rem;
`;

function LeadsImportPreviewCard({
  preview,
  importResult,
  onConfirm,
  isConfirming,
}) {
  if (!preview) return null;

  const sampleDuplicates = preview?.remote?.duplicate_samples || [];
  const duplicateRows = importResult?.duplicate_rows_export || [];

  async function handleDownloadNewLeads() {
    if (!importResult?.batch_id) return;
    try {
      if (importResult.clean_file_path) {
        await downloadStoredLeadFile({
          path: importResult.clean_file_path,
          filename: `lead-batch-${importResult.batch_id}.csv`,
          campaignName: importResult.campaign_name,
        });
      } else {
        await downloadLeadBatchCsv(importResult.batch_id, {
          filename: `lead-batch-${importResult.batch_id}.csv`,
          campaignName: importResult.campaign_name,
        });
      }
    } catch (error) {
      toast.error(error.message || "Could not download imported leads file");
    }
  }

  async function handleDownloadDuplicateLeads() {
    if (!importResult?.batch_id || !duplicateRows.length) return;
    try {
      if (importResult.duplicate_file_path) {
        await downloadStoredLeadFile({
          path: importResult.duplicate_file_path,
          filename: `duplicate-leads-batch-${importResult.batch_id}.csv`,
          campaignName: importResult.campaign_name,
          includeReason: true,
        });
      } else {
        downloadDuplicateLeadsCsv(duplicateRows, {
          filename: `duplicate-leads-batch-${importResult.batch_id}.csv`,
          campaignName: importResult.campaign_name,
        });
      }
    } catch (error) {
      toast.error(error.message || "Could not download duplicate leads file");
    }
  }

  return (
    <Card>
      <Title>Import Preview</Title>
      <StatsGrid>
        <StatItem>Total rows: {preview.local.summary.totalRows}</StatItem>
        <StatItem>Valid rows: {preview.local.summary.validRows}</StatItem>
        <StatItem>
          Duplicates to skip: {preview.local.summary.duplicateRows}
        </StatItem>
        <StatItem>Invalid rows to skip: {preview.local.summary.invalidRows}</StatItem>
      </StatsGrid>

      {sampleDuplicates.length > 0 ? (
        <>
          <strong>Duplicate email samples</strong>
          <SampleList>
            {sampleDuplicates.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </SampleList>
        </>
      ) : null}

      <Button onClick={onConfirm} disabled={isConfirming}>
        {isConfirming ? "Importing..." : "Import New Leads"}
      </Button>

      {importResult ? (
        <ResultBox>
          Batch #{importResult.batch_id}: imported {importResult.inserted_rows},
          skipped {importResult.duplicate_rows} duplicates and
          {" "}
          {importResult.invalid_rows} invalid rows.
          <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem" }}>
            <Button size="small" onClick={handleDownloadNewLeads}>
              Download New Leads CSV
            </Button>
            {duplicateRows.length ? (
              <Button
                size="small"
                variation="secondary"
                onClick={handleDownloadDuplicateLeads}
              >
                Download Duplicate Leads CSV
              </Button>
            ) : null}
          </div>
        </ResultBox>
      ) : null}
    </Card>
  );
}

export default LeadsImportPreviewCard;
