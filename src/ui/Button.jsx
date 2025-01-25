import styled, { css } from "styled-components";

const sizes = {
  medium: css`
    font-size: 1.2rem;
    padding: 1.2rem 1.6rem;
    font-weight: 500;
  `,
};

const variation = {
  primary: css`
    color: var(--color-brand-50);
    background-color: var(--color-brand-500);

    &:hover {
      background-color: var(--color-brand-700);
    }
  `,
};

const Button = styled.button`
  border: none;
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-md);

  ${(props) => sizes[props.size || "medium"]};
  ${(props) => variation[props.variation || "primary"]};
`;

export default Button;
