import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import Papa from "papaparse";

import {
  buildPreviewRows,
  hasEmailColumn,
  normalizeCsvHeader,
} from "../../leads/utils/csv";
import { buildDripRows } from "../utils/dripRows";
import { useSimDripPreview } from "../hooks/useSimDripPreview";
import { useSimDripCreate } from "../hooks/useSimDripCreate";
import Button from "../../../ui/Button";
import SpinnerMini from "../../../ui/SpinnerMini";
import SimCsvDropzone from "./SimCsvDropzone";
import SimDripPreviewCard from "./SimDripPreviewCard";

const Form = styled.div`
  display: grid;
  gap: 1.6rem;
`;

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

function defaultDripName(filename) {
  return String(filename || "").replace(/\.csv$/i, "") || "drip";
}

export default function SimDripForm({ client, onViewDrip }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [dripName, setDripName] = useState("");
  const [dailyVolume, setDailyVolume] = useState(client.default_daily_volume || 25);

  const { previewDrip, isPreviewing } = useSimDripPreview();
  const { createDrip, isCreating } = useSimDripCreate(client.id);

  function handleFile(next) {
    setFile(next);
    setParsedRows([]);
    setPreview(null);
    setCreateResult(null);
    if (next) setDripName(defaultDripName(next.name));
  }

  async function handlePreview() {
    if (!file) {
      toast.error("Drop a CSV file first");
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

    try {
      const remote = await previewDrip({
        clientId: client.id,
        emails: local.candidateEmails,
      });

      const validRows =
        local.summary.totalRows -
        local.summary.invalidRows -
        local.summary.inFileDuplicateRows;
      const duplicateRows =
        local.summary.inFileDuplicateRows + (remote?.duplicate_count || 0);

      setParsedRows(parsed.data);
      setCreateResult(null);
      setPreview({
        summary: {
          totalRows: local.summary.totalRows,
          validRows,
          duplicateRows,
          invalidRows: local.summary.invalidRows,
          newCount: Math.max(validRows - duplicateRows, 0),
        },
        duplicateSamples: remote?.duplicate_samples || [],
      });
    } catch (error) {
      toast.error(error.message || "Could not preview drip");
    }
  }

  async function handleCreate() {
    if (!preview || parsedRows.length === 0) return;

    try {
      const result = await createDrip({
        clientId: client.id,
        name: dripName || defaultDripName(file?.name),
        sourceFilename: file?.name || "leads.csv",
        dailyVolume,
        rows: buildDripRows(parsedRows),
      });
      setCreateResult(result);
      toast.success("Drip created");
      setFile(null);
      setParsedRows([]);
      setPreview(null);
    } catch (error) {
      toast.error(error.message || "Could not create drip");
    }
  }

  return (
    <Form>
      <SimCsvDropzone file={file} onFile={handleFile} />

      <div>
        <Button type="button" onClick={handlePreview} disabled={!file || isPreviewing}>
          {isPreviewing ? (
            <>
              <SpinnerMini /> Previewing…
            </>
          ) : (
            "Preview"
          )}
        </Button>
      </div>

      <SimDripPreviewCard
        preview={preview}
        dripName={dripName}
        onNameChange={setDripName}
        dailyVolume={dailyVolume}
        onVolumeChange={setDailyVolume}
        onConfirm={handleCreate}
        isCreating={isCreating}
        createResult={createResult}
        onViewDrip={onViewDrip}
      />
    </Form>
  );
}
