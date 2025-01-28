import styled from "styled-components";
import FormContainer from "../../ui/FormContainer";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCreateDeposit } from "../budget/useAddDeposit";
import { useForm } from "react-hook-form";
import Button from "../../ui/Button";

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid;
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
`;

function DepositAddAdminForm() {
  const { isPending: isEditing, addDeposit } = useCreateDeposit();
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    addDeposit({ newDeposit: data });
  };

  return (
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
        {isEditing ? "Adding..." : "Add Deposit"}
      </Button>
    </FormContainer>
  );
}

export default DepositAddAdminForm;
