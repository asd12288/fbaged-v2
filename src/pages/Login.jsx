import styled from "styled-components";
import LoginForm from "../features/auth/LoginForm";
import Heading from "../ui/Heading";
import Logo from "../ui/Logo";
import { useMaintenance } from "../features/auth/useMaintenceMode";
import { HiExclamationCircle } from "react-icons/hi";
import FullPageSpinner from "../ui/FullPageSpinner";

const LoginLayout = styled.main`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 48rem;
  align-content: center;
  justify-content: center;
  gap: 3.2rem;
  background-color: var(--color-grey-50);
`;

const StyledMaintenanceMessage = styled.p`
  text-align: center;
  margin: 0;
  padding: 0;
`;

function Login() {
  const { isMaintenanceMode, isLoading } = useMaintenance();

  if (isLoading) return <FullPageSpinner />;

  return (
    <LoginLayout>
      <Logo as="loginLogo" />
      <Heading as="h4">Login into your account</Heading>
      {isMaintenanceMode && (
        <StyledMaintenanceMessage>
          Currently under maintenance... <HiExclamationCircle />
        </StyledMaintenanceMessage>
      )}

      <LoginForm />
    </LoginLayout>
  );
}

export default Login;
