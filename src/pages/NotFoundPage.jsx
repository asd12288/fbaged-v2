import { Link } from "react-router";
import Heading from "../ui/Heading";
import styled from "styled-components";

const StyledLink = styled(Link)`
  color: #0077cc;
  text-decoration: none;
  font-weight: bold;
`;

const StyledNotFound = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const StyledNotFoundMessage = styled.p`
  font-size: 4rem;
  font-weight: 500;
`;

function NotFoundPage() {
  return (
    <StyledNotFound>
      <Heading>404 Not Found</Heading>
      <StyledNotFoundMessage>
        Sorry, the page you are looking for is not available.
      </StyledNotFoundMessage>
      <StyledLink to="/login">Go back to the homepage</StyledLink>
    </StyledNotFound>
  );
}

export default NotFoundPage;
