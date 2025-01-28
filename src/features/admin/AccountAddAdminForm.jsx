import styled from "styled-components";
import FormContainer from "../../ui/FormContainer";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { useForm } from "react-hook-form";
import useAddAccount from "../budget/useAddAccount";
import SpinnerMini from "../../ui/SpinnerMini";



function AccountAddAdminForm() {
  const { addAccount, isAdding } = useAddAccount();
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    addAccount({ newAccount: data });
  };
  return (
    <FormContainer onSubmit={handleSubmit(onSubmit)}>
      <FormRowVertical>
        <label>Account name</label>
        <Input {...register("nameAccount")} />
      </FormRowVertical>

      <FormRowVertical>
        <label>Number of accounts</label>
        <Input type="number" {...register("numAccounts")} />
      </FormRowVertical>
      <FormRowVertical>
        <label>cost (each)</label>
        <Input {...register("cost")} />
      </FormRowVertical>
      <Button type="submit">
        {isAdding ? <SpinnerMini /> : "Add Account"}
      </Button>
    </FormContainer>
  );
}

export default AccountAddAdminForm;
