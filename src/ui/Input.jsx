import styled from "styled-components";

const Input = styled.input`
  font-size: 1.4rem;
  padding: 1.2rem 1.6rem;
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  width: 100%;
  margin-bottom: 1.6rem;
  box-shadow: var(--shadow-md);

  &[type="number"]::-webkit-inner-spin-button,
  &[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type="number"] {
    -moz-appearance: textfield; /* Removes spinner for Firefox */
  }
`;

export default Input;
