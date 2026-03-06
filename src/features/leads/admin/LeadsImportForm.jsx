import { useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Papa from "papaparse";

import { useUsers } from "../../users/useUsers";
import { useCampaigns } from "../../campaigns/useCampaigns";
import { buildPreviewRows, hasEmailColumn, normalizeCsvHeader } from "../utils/csv";
import { useLeadImportPreview } from "../hooks/useLeadImportPreview";
import { useLeadImportConfirm } from "../hooks/useLeadImportConfirm";

import FormRowVertical from "../../../ui/FormRowVertical";
import Select from "../../../ui/Select";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import SpinnerMini from "../../../ui/SpinnerMini";
import LeadsImportPreviewCard from "./LeadsImportPreviewCard";

const Form = styled.form`
  display: grid;
  gap: 1.6rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SmallText = styled.p`
  margin: 0;
  color: var(--color-grey-500);
  font-size: 1.2rem;
`;

const ACTIVE_CAMPAIGN_STATUSES = new Set(["Active", "Learning"]);

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeCsvHeader,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });
}

function LeadsImportForm() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const { data: users = [], isPending: isUsersPending } = useUsers();
  const { data: campaigns = [], isPending: isCampaignsPending } = useCampaigns({
    filterUserId: selectedUserId || undefined,
  });
  const { previewImport, isPreviewing } = useLeadImportPreview();
  const { confirmImport, isConfirming } = useLeadImportConfirm();

  const userOptions = useMemo(
    () => [
      { value: "", label: "Select user" },
      ...users.map((user) => ({
        value: user.id,
        label: user.username || user.email || user.id,
      })),
    ],
    [users]
  );

  const activeCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) =>
        ACTIVE_CAMPAIGN_STATUSES.has(campaign.status)
      ),
    [campaigns]
  );

  const campaignOptions = useMemo(
    () => [
      { value: "", label: "Select campaign" },
      ...activeCampaigns.map((campaign) => ({
        value: String(campaign.id),
        label: campaign.campaignName || `Campaign #${campaign.id}`,
      })),
    ],
    [activeCampaigns]
  );

  async function handlePreview(event) {
    event.preventDefault();

    if (!selectedUserId) {
      toast.error("Select user first");
      return;
    }

    if (!selectedCampaignId) {
      toast.error("Select campaign first");
      return;
    }

    if (!file) {
      toast.error("Upload CSV file first");
      return;
    }

    const parsed = await parseCsv(file);
    if (!Array.isArray(parsed.data)) {
      toast.error("Could not parse CSV file");
      return;
    }

    if (!hasEmailColumn(parsed.meta?.fields)) {
      toast.error("CSV must include an email column");
      return;
    }

    const local = buildPreviewRows(parsed.data);

    const remote = await previewImport({
      assignedUserId: selectedUserId,
      campaignId: Number(selectedCampaignId),
      emails: local.candidateEmails,
    });

    setParsedRows(parsed.data);
    setImportResult(null);
    setPreview({
      local: {
        summary: {
          totalRows: local.summary.totalRows,
          validRows:
            local.summary.totalRows -
            local.summary.invalidRows -
            local.summary.inFileDuplicateRows,
          duplicateRows:
            local.summary.inFileDuplicateRows + (remote?.duplicate_count || 0),
          invalidRows: local.summary.invalidRows,
        },
      },
      remote,
    });
  }

  async function handleConfirmImport() {
    if (!preview || parsedRows.length === 0) return;

    const result = await confirmImport({
      assignedUserId: selectedUserId,
      campaignId: Number(selectedCampaignId),
      sourceFilename: file?.name || "leads.csv",
      rows: parsedRows,
    });

    setImportResult(result);
    if (result.storage_warning) {
      toast.error(result.storage_warning);
    } else {
      toast.success("Leads imported successfully");
    }
  }

  return (
    <Form onSubmit={handlePreview}>
      <Row>
        <FormRowVertical>
          <label htmlFor="assigned-user">Select User</label>
          <Select
            id="assigned-user"
            value={selectedUserId}
            onChange={(event) => {
              setSelectedUserId(event.target.value);
              setSelectedCampaignId("");
              setPreview(null);
              setImportResult(null);
            }}
            options={userOptions}
            disabled={isUsersPending}
          />
        </FormRowVertical>

        <FormRowVertical>
          <label htmlFor="assigned-campaign">Select Campaign</label>
          <Select
            id="assigned-campaign"
            value={selectedCampaignId}
            onChange={(event) => {
              setSelectedCampaignId(event.target.value);
              setPreview(null);
              setImportResult(null);
            }}
            options={campaignOptions}
            disabled={!selectedUserId || isCampaignsPending}
          />
        </FormRowVertical>
      </Row>

      <FormRowVertical>
        <label htmlFor="csv-file">Upload CSV</label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setPreview(null);
            setImportResult(null);
          }}
        />
        <SmallText>Required column: email</SmallText>
      </FormRowVertical>

      <div>
        <Button type="submit" disabled={isPreviewing}>
          {isPreviewing ? (
            <>
              <SpinnerMini /> Previewing...
            </>
          ) : (
            "Preview Duplicates"
          )}
        </Button>
      </div>

      <LeadsImportPreviewCard
        preview={preview}
        importResult={importResult}
        onConfirm={handleConfirmImport}
        isConfirming={isConfirming}
      />
    </Form>
  );
}

export default LeadsImportForm;
