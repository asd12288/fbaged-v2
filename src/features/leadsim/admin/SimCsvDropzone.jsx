import { useRef, useState } from "react";
import styled from "styled-components";

const Zone = styled.div`
  border: 2px dashed
    ${(props) => (props.$active ? "var(--color-brand-600)" : "var(--color-grey-300)")};
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
  text-align: center;
  cursor: pointer;
  background: ${(props) => (props.$active ? "var(--color-grey-50)" : "transparent")};
  transition: border-color 0.15s, background 0.15s;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-grey-500);
`;

const FileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.3rem;
  color: var(--color-grey-700);
`;

const Chip = styled.span`
  padding: 0.3rem 0.9rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-grey-100);
`;

const ReplaceLink = styled.button`
  background: none;
  border: none;
  color: var(--color-brand-600);
  cursor: pointer;
  font-size: 1.2rem;
  text-decoration: underline;
`;

const HiddenInput = styled.input`
  display: none;
`;

export default function SimCsvDropzone({ file, onFile }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  return (
    <Zone
      $active={active}
      role={file ? undefined : "button"}
      tabIndex={file ? undefined : 0}
      aria-label={file ? undefined : "Upload CSV file"}
      onClick={file ? undefined : openPicker}
      onKeyDown={file ? undefined : handleKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    >
      <HiddenInput
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      {file ? (
        <FileRow>
          <Chip>{file.name}</Chip>
          <ReplaceLink
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            Replace file
          </ReplaceLink>
        </FileRow>
      ) : (
        <Hint>Drop a CSV or click to browse · Required column: email</Hint>
      )}
    </Zone>
  );
}
