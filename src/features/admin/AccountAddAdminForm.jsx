import styled from "styled-components";
import FormContainer from "../../ui/FormContainer";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { useForm } from "react-hook-form";
import useAddAccount from "../budget/useAddAccount";
import { useAdminScope } from "./AdminScopeContext";
import SpinnerMini from "../../ui/SpinnerMini";
import { useState } from "react";
import toast from "react-hot-toast";
import { HiCurrencyDollar } from "react-icons/hi";

const FormTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--color-grey-700);
  margin-bottom: 1.6rem;
`;

const InputGroup = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    color: var(--color-grey-500);
    width: 2rem;
    height: 2rem;
  }
`;

const CurrencyInput = styled(Input)`
  padding-left: 3rem;
`;

const ErrorMessage = styled.p`
  color: var(--color-red-700);
  font-size: 1.2rem;
  margin-top: 0.5rem;
`;

const SuccessMessage = styled.div`
  background-color: var(--color-green-100);
  color: var(--color-green-700);
  padding: 1.2rem;
  border-radius: var(--border-radius-sm);
  margin-bottom: 1.6rem;
  font-weight: 500;
`;

function AccountAddAdminForm() {
  const { addAccount, isAdding } = useAddAccount();
  const { selectedUserId } = useAdminScope();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    const formattedData = {
      ...data,
      numAccounts: Number(data.numAccounts),
      cost: Number(data.cost),
    };

    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }

    addAccount(
      {
        newAccount: { ...formattedData, user_id: selectedUserId },
      },
      {
        onSuccess: () => {
          toast.success("Account added successfully");
          setShowSuccess(true);
          reset();

          // Hide success message after 3 seconds
          setTimeout(() => setShowSuccess(false), 3000);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add account");
        },
      }
    );
  };

  return (
    <FormContainer onSubmit={handleSubmit(onSubmit)}>
      <FormTitle>Add New Account</FormTitle>

      {showSuccess && (
        <SuccessMessage>Account added successfully!</SuccessMessage>
      )}

      <FormRowVertical>
        <label htmlFor="nameAccount">Account Name</label>
        <Input
          id="nameAccount"
          {...register("nameAccount", {
            required: "Account name is required",
          })}
          disabled={isAdding}
        />
        {errors.nameAccount && (
          <ErrorMessage>{errors.nameAccount.message}</ErrorMessage>
        )}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="numAccounts">Number of Accounts</label>
        <Input
          id="numAccounts"
          type="number"
          min="1"
          {...register("numAccounts", {
            required: "Number of accounts is required",
            min: {
              value: 1,
              message: "Must have at least 1 account",
            },
            valueAsNumber: true,
          })}
          disabled={isAdding}
        />
        {errors.numAccounts && (
          <ErrorMessage>{errors.numAccounts.message}</ErrorMessage>
        )}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="cost">Cost (Each)</label>
        <InputGroup>
          <HiCurrencyDollar />
          <CurrencyInput
            id="cost"
            type="number"
            step="0.01"
            min="0"
            {...register("cost", {
              required: "Cost is required",
              min: {
                value: 0,
                message: "Cost cannot be negative",
              },
              valueAsNumber: true,
            })}
            disabled={isAdding}
          />
        </InputGroup>
        {errors.cost && <ErrorMessage>{errors.cost.message}</ErrorMessage>}
      </FormRowVertical>

      <Button type="submit" disabled={isAdding}>
        {isAdding ? <SpinnerMini /> : "Add Account"}
      </Button>
    </FormContainer>
  );
}

export default AccountAddAdminForm;
