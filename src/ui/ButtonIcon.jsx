import styled from "styled-components";

const ButtonIcon = styled.button`
  background: none;
  border: none;
  padding: 0.6rem;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    background-color: var(--color-grey-100);
    border-radius: var(--border-radius-md);
  }

  & svg {
    color: var(--color-grey-600);
    width: 2.4rem;
    height: 2.4rem;
  }
`;

export default ButtonIcon;
