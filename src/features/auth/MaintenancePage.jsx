import styled from "styled-components";
import LoginForm from "./LoginForm";

const StyledMaintenceMode = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const StyledMessageMaintence = styled.p`
  font-size: 4rem;
  font-weight: 500;
`;

const StlyedImageMaintence = styled.img`
  width: 200px;
  height: 200px;
`;

function MaintenancePage() {
  return (
    <StyledMaintenceMode>
      <StyledMessageMaintence>
        We&apos;re currently under maintence, retry again later{" "}
      </StyledMessageMaintence>
      <StlyedImageMaintence src="/logo.png" alt="Under maintence" />
      <LoginForm />
    </StyledMaintenceMode>
  );
}

export default MaintenancePage;
