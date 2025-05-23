import styled, { css } from "styled-components";

const sizes = {
  medium: css`
    font-size: 1.2rem;
    padding: 1.2rem 1.6rem;
    font-weight: 500;
  `,

  small: css`
    font-size: 1rem;
    padding: 0.8rem 1rem;
    font-weight: 500;
    margin: 0rem 0.4rem;
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
  secondary: css`
    color: var(--color-grey-0);
    background-color: var(--color-grey-500);

    &:hover {
      background-color: var(--color-grey-700);
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
