/* eslint-disable react/prop-types */
import React from "react";
import styled from "styled-components";
import MyLeadsRow from "./MyLeadsRow";

const Wrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  background: var(--color-grey-0);
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

const Empty = styled.p`
  font-size: 1.4rem;
  color: var(--color-grey-500);
  margin: 1.2rem 0;
`;

function MyLeadsTable({ batches = [], onDownload }) {
  if (!batches.length) {
    return <Empty>No lead imports found yet.</Empty>;
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
          {batches.map((batch) => (
            <MyLeadsRow key={batch.id} batch={batch} onDownload={onDownload} />
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
}

export default MyLeadsTable;
