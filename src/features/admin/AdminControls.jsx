import styled from "styled-components";
import Button from "../../ui/Button";
import Spinner from "../../ui/Spinner";
import { useMaintenance } from "../auth/useMaintenceMode";

const StyledControls = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: center;
`;

function AdminControls() {
  const { isMaintenanceMode, toggleMaintenance, isLoading, isToggling } =
    useMaintenance();

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <StyledControls>
      <p>Maintenance mode is: {isMaintenanceMode ? "ON" : "OFF"}</p>
      <Button
        disabled={isToggling}
        onClick={() => toggleMaintenance(!isMaintenanceMode)}
      >
        {!isMaintenanceMode
          ? "Turn on Maintenance Mode"
          : " Turn off Maintenance Mode"}
      </Button>
    </StyledControls>
  );
}

export default AdminControls;
