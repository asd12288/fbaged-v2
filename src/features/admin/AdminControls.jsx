import styled from "styled-components";
import Button from "../../ui/Button";
import Spinner from "../../ui/Spinner";
import { useMaintenance } from "../auth/useMaintenceMode";
import { HiShieldCheck, HiShieldExclamation } from "react-icons/hi";

const StyledControls = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: center;
  justify-content: space-between;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-weight: 600;
  color: ${(props) =>
    props.isOn ? "var(--color-red-700)" : "var(--color-green-700)"};

  svg {
    width: 2.2rem;
    height: 2.2rem;
  }
`;

function AdminControls() {
  const { isMaintenanceMode, toggleMaintenance, isLoading, isToggling } =
    useMaintenance();

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <StyledControls>
      <StatusContainer>
        <p>System Status:</p>
        <StatusIndicator isOn={isMaintenanceMode}>
          {isMaintenanceMode ? (
            <>
              <HiShieldExclamation />
              <span>Maintenance Mode</span>
            </>
          ) : (
            <>
              <HiShieldCheck />
              <span>Normal Operations</span>
            </>
          )}
        </StatusIndicator>
      </StatusContainer>

      <Button
        disabled={isToggling}
        onClick={() => toggleMaintenance(!isMaintenanceMode)}
        variant={isMaintenanceMode ? "secondary" : "danger"}
      >
        {isToggling ? (
          <Spinner />
        ) : !isMaintenanceMode ? (
          "Enable Maintenance Mode"
        ) : (
          "Disable Maintenance Mode"
        )}
      </Button>
    </StyledControls>
  );
}

export default AdminControls;
