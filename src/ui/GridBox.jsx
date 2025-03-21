import styled, { css } from "styled-components";

const GridBox = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-100);
  border-radius: var(--border-radius-md);
  padding: 2.5rem;

  ${(props) =>
    props.size === "small" &&
    css`
      padding-top: 1rem;
    `}

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export default GridBox;
