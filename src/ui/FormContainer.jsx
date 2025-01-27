import styled from "styled-components";

const FormContainer = styled.form`
  /* Use flex to place columns side by side */
  display: flex;
  flex-direction: column;
  gap: 1rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-100);
`;

export default FormContainer;
