import { useMemo, useState } from "react";
import styled from "styled-components";
import Select from "../../../ui/Select";
import FormRowVertical from "../../../ui/FormRowVertical";
import { useSimClients } from "../hooks/useSimClients";
import { formatPacingLine } from "../utils/pacing";
import SimDripForm from "./SimDripForm";
import SimDripsTable from "./SimDripsTable";
import SimDripDetail from "./SimDripDetail";
import SimDryRunBanner from "./SimDryRunBanner";

const Region = styled.div`
  width: 100%;
  margin-bottom: 2.4rem;
`;

const PacingLine = styled.p`
  margin: 0.8rem 0 0;
  font-size: 1.3rem;
  color: var(--color-grey-600);
`;

const SectionHeading = styled.h3`
  margin: 0 0 1.2rem;
  font-size: 1.6rem;
`;

const Empty = styled.p`
  width: 100%;
  font-size: 1.4rem;
  color: var(--color-grey-600);
`;

export default function SimDripsPanel({ initialClientId = null }) {
  const { clients } = useSimClients();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [openDripId, setOpenDripId] = useState(null);

  const clientOptions = useMemo(
    () => [
      { value: "", label: "Select a sim client" },
      ...clients.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clients]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  if (openDripId) {
    return (
      <SimDripDetail dripId={openDripId} onBack={() => setOpenDripId(null)} />
    );
  }

  return (
    <>
      <SimDryRunBanner />

      <Region>
        <FormRowVertical>
          <label htmlFor="drip-client">Sim client</label>
          <Select
            id="drip-client"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={clientOptions}
          />
        </FormRowVertical>
        {selectedClient ? (
          <PacingLine>{formatPacingLine(selectedClient)}</PacingLine>
        ) : null}
      </Region>

      {selectedClient ? (
        <Region>
          <SimDripForm
            key={selectedClient.id}
            client={selectedClient}
            onViewDrip={setOpenDripId}
          />
        </Region>
      ) : (
        <Empty>Select a sim client to create a drip and view its lists.</Empty>
      )}

      <Region>
        <SectionHeading>Drips</SectionHeading>
        <SimDripsTable
          clientId={selectedClientId || null}
          onOpenDrip={(drip) => setOpenDripId(drip.id)}
        />
      </Region>
    </>
  );
}
