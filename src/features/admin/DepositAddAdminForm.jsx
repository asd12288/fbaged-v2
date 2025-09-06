import styled from "styled-components";
import FormContainer from "../../ui/FormContainer";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCreateDeposit } from "../budget/useAddDeposit";
import { useForm } from "react-hook-form";
import Button from "../../ui/Button";
import { HiCalendar, HiCurrencyDollar, HiCreditCard } from "react-icons/hi";
import SpinnerMini from "../../ui/SpinnerMini";
import toast from "react-hot-toast";
import { useState } from "react";
import { useAdminScope } from "./AdminScopeContext";

const FormTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--color-grey-700);
  margin-bottom: 1.6rem;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  padding-left: 3rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  width: 100%;
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

const DateInput = styled(Input)`
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

function DepositAddAdminForm() {
  const { isPending: isAdding, addDeposit } = useCreateDeposit();
  const { selectedUserId } = useAdminScope();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dateAdded: new Date().toISOString().split("T")[0], // Today's date
      type: "bank",
    },
  });

  const onSubmit = (data) => {
    const formattedData = {
      ...data,
      amount: Number(data.amount),
    };

    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }

    addDeposit(
      {
        newDeposit: { ...formattedData, user_id: selectedUserId },
      },
      {
        onSuccess: () => {
          toast.success("Deposit added successfully");
          setShowSuccess(true);
          reset({
            dateAdded: new Date().toISOString().split("T")[0],
            type: "bank",
          });

          // Hide success message after 3 seconds
          setTimeout(() => setShowSuccess(false), 3000);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add deposit");
        },
      }
    );
  };

  return (
    <FormContainer onSubmit={handleSubmit(onSubmit)}>
      <FormTitle>Add New Deposit</FormTitle>

      {showSuccess && (
        <SuccessMessage>Deposit added successfully!</SuccessMessage>
      )}

      <FormRowVertical>
        <label htmlFor="amount">Amount</label>
        <InputGroup>
          <HiCurrencyDollar />
          <CurrencyInput
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount", {
              required: "Amount is required",
              min: {
                value: 0.01,
                message: "Amount must be greater than 0",
              },
              valueAsNumber: true,
            })}
            disabled={isAdding}
          />
        </InputGroup>
        {errors.amount && <ErrorMessage>{errors.amount.message}</ErrorMessage>}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="type">Type of Transfer</label>
        <InputGroup>
          <HiCreditCard />
          <StyledSelect
            id="type"
            {...register("type", {
              required: "Type is required",
            })}
            disabled={isAdding}
          >
            <option value="crypto">Cryptocurrency</option>
            <option value="bank">Bank Transfer</option>
            <option value="credit">Credit Card</option>
          </StyledSelect>
        </InputGroup>
        {errors.type && <ErrorMessage>{errors.type.message}</ErrorMessage>}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="dateAdded">Date</label>
        <InputGroup>
          <HiCalendar />
          <DateInput
            id="dateAdded"
            type="date"
            {...register("dateAdded", {
              required: "Date is required",
            })}
            disabled={isAdding}
          />
        </InputGroup>
        {errors.dateAdded && (
          <ErrorMessage>{errors.dateAdded.message}</ErrorMessage>
        )}
      </FormRowVertical>

      <Button type="submit" disabled={isAdding}>
        {isAdding ? <SpinnerMini /> : "Add Deposit"}
      </Button>
    </FormContainer>
  );
}

export default DepositAddAdminForm;
