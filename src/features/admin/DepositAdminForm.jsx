import styled from "styled-components";
import GridBox from "../../ui/GridBox";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCreateDeposit } from "../budget/useAddDeposit";
import { useForm } from "react-hook-form";
import Button from "../../ui/Button";
import { useDeposits } from "../budget/useDeposits";

const FormContainer = styled.form`
  /* Use flex to place columns side by side */
  display: flex;
  flex-direction: column;
  gap: 1rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-100);
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid;
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
`;

function DepositAdminForm() {
  const { isPending: isEditing, addDeposit } = useCreateDeposit();
  const { data: deposits, isPending: depositPending } = useDeposits();
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    addDeposit({ newDeposit: data });
  };

  return (
    <GridBox>
      <FormContainer onSubmit={handleSubmit(onSubmit)}>
        <FormRowVertical>
          <label>Amount</label>
          <Input {...register("amount")} />
        </FormRowVertical>

        <FormRowVertical>
          <label>Type of Transfer</label>
          <StyledSelect {...register("type")}>
            <option value="crypto">Crypto</option>
            <option value="bank">Bank transfer</option>
            <option value="credit">Credit card</option>
          </StyledSelect>
        </FormRowVertical>
        <FormRowVertical>
          <label>date</label>
          <Input type="date" {...register("dateAdded")} />
        </FormRowVertical>
        <Button type="submit" disabled={isEditing}>
          add
        </Button>
      </FormContainer>
    </GridBox>
  );
}

export default DepositAdminForm;
