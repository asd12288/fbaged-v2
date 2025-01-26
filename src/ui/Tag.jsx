import styled, { css } from "styled-components";

const Tag = styled.div`
  padding: 0.4rem 1rem;
  color: var(--color-grey-0);
  border-radius: 2rem;
  font-size: 1.1rem;
  text-align: center;

  ${(props) =>
    props.variant === "Active" &&
    css`
      background-color: var(--color-brand-700);
    `}

  ${(props) =>
    props.variant === "Paused" &&
    css`
      background-color: var(--color-yellow-700);
    `}

  ${(props) =>
    props.variant === "Learning" &&
    css`
      background-color: var(--color-indigo-700);
    `}

    
  ${(props) =>
    props.variant === "Inactive" &&
    css`
      background-color: var(--color-red-700);
    `}

  ${(props) =>
    props.variant === "crypto" &&
    css`
      background-color: var(--color-yellow-700);
    `}

  ${(props) =>
    props.variant === "bank-transfer" &&
    css`
      background-color: var(--color-blue-700);
    `}

  ${(props) =>
    props.size === "small" &&
    css`
      font-size: 1rem;
    `}
`;

export default Tag;
