import styled from "styled-components";

const StyledEmptyDiv = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 2.5rem;
  text-align: center;
  color: var(--color-grey-300);
  font-weight: 500;
`;

function Empty() {
  return (
    <StyledEmptyDiv>You have no active campaigns in this moment</StyledEmptyDiv>
  );
}

export default Empty;
