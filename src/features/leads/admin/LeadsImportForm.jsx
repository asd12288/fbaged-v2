import { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Papa from "papaparse";

import { useUsers } from "../../users/useUsers";
import { useCampaigns } from "../../campaigns/useCampaigns";
import { buildPreviewRows } from "../utils/csv";
import { useLeadImportPreview } from "../hooks/useLeadImportPreview";
import { useLeadImportConfirm } from "../hooks/useLeadImportConfirm";

import FormRowVertical from "../../../ui/FormRowVertical";
import Select from "../../../ui/Select";
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

const UploadArea = styled.div`
  border: 2px dashed
    ${(props) =>
      props.$hasFile ? "var(--color-green-500)" : "var(--color-grey-300)"};
  border-radius: var(--border-radius-md);
  padding: 1.2rem;
  background: var(--color-grey-0);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    border-color: var(--color-brand-500);
    background: var(--color-grey-50);
  }
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const FileStatus = styled.p`
  margin: 0.4rem 0 0;
  font-size: 1.2rem;
  color: ${(props) =>
    props.$hasFile ? "var(--color-green-700)" : "var(--color-grey-500)"};
`;

const UploadActions = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-top: 0.8rem;
`;

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });
}

function LeadsImportForm() {
  const fileInputRef = useRef(null);
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

  const campaignOptions = useMemo(
    () => [
      { value: "", label: "Select campaign" },
      ...campaigns
        .filter((campaign) => campaign.status === "Active")
        .map((campaign) => ({
          value: String(campaign.id),
          label: campaign.campaignName || `Campaign #${campaign.id}`,
        })),
    ],
    [campaigns]
  );

  function handleFileSelect(nextFile) {
    setFile(nextFile || null);
    setPreview(null);
    setImportResult(null);
  }

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

    if (!parsed.meta?.fields?.includes("email")) {
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
    toast.success("Leads imported successfully");
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
        <HiddenFileInput
          ref={fileInputRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            handleFileSelect(event.target.files?.[0] || null);
          }}
        />
        <UploadArea
          $hasFile={!!file}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <FileStatus $hasFile={!!file}>
            {file ? `Selected file: ${file.name}` : "Click here to choose CSV"}
          </FileStatus>
          <SmallText>Required column: email</SmallText>
          <UploadActions>
            <Button
              type="button"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose CSV
            </Button>
            {file ? (
              <Button
                type="button"
                size="small"
                variation="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  handleFileSelect(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            ) : null}
          </UploadActions>
        </UploadArea>
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
