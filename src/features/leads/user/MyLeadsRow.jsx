/* eslint-disable react/prop-types */
import React from "react";
import styled from "styled-components";
import Button from "../../../ui/Button";

const Tr = styled.tr`
  border-bottom: 1px solid var(--color-grey-200);
`;

const Td = styled.td`
  padding: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

function MyLeadsRow({ batch, onDownload }) {
  const importDate = new Date(batch.created_at).toLocaleDateString();
  const campaignName =
    batch?.campaign?.campaignName || `Campaign #${batch.campaign_id}`;

  return (
    <Tr>
      <Td>{importDate}</Td>
      <Td>{campaignName}</Td>
      <Td>{batch.source_filename}</Td>
      <Td>{batch.inserted_rows}</Td>
      <Td>{batch.duplicate_rows}</Td>
      <Td>{batch.invalid_rows}</Td>
      <Td>
        <Button size="small" onClick={() => onDownload(batch)}>
          Download CSV
        </Button>
      </Td>
    </Tr>
  );
}

export default MyLeadsRow;
