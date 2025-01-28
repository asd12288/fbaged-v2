import styled from "styled-components";

const StyledLogo = styled.div`
  text-align: center;
`;

const Img = styled.img`
  height: 15rem;
  width: auto;
  margin: 0
`;

function Logo() {
  return (
    <StyledLogo>
      <Img src="/logo.png" alt="Logo" />
    </StyledLogo>
  );
}

export default Logo;
