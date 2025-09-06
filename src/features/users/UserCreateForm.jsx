import styled from "styled-components";
import FormContainer from "../../ui/FormContainer";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import { useForm } from "react-hook-form";
import { useCreateUser } from "./useCreateUser";
import SpinnerMini from "../../ui/SpinnerMini";
import { useState } from "react";
import { HiUser, HiMail, HiKey } from "react-icons/hi";

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

const IconInput = styled(Input)`
  padding-left: 3rem;
`;

const Select = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  box-shadow: var(--shadow-sm);
  width: 100%;

  &:disabled {
    background-color: var(--color-grey-200);
    cursor: not-allowed;
  }
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

function UserCreateForm() {
  const { addUser, isCreating } = useCreateUser();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    addUser(data, {
      onSuccess: () => {
        setShowSuccess(true);
        reset();
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      },
    });
  };

  return (
    <FormContainer onSubmit={handleSubmit(onSubmit)}>
      <FormTitle>Create New User</FormTitle>

      {showSuccess && (
        <SuccessMessage>User created successfully!</SuccessMessage>
      )}

      <FormRowVertical>
        <label htmlFor="username">Username</label>
        <InputGroup>
          <HiUser />
          <IconInput
            id="username"
            {...register("username", {
              required: "Username is required",
              minLength: {
                value: 3,
                message: "Username must be at least 3 characters",
              },
            })}
            disabled={isCreating}
            placeholder="Enter username"
          />
        </InputGroup>
        {errors.username && (
          <ErrorMessage>{errors.username.message}</ErrorMessage>
        )}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="email">Email</label>
        <InputGroup>
          <HiMail />
          <IconInput
            id="email"
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            })}
            disabled={isCreating}
            placeholder="Enter email address"
          />
        </InputGroup>
        {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="password">Password</label>
        <InputGroup>
          <HiKey />
          <IconInput
            id="password"
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            disabled={isCreating}
            placeholder="Enter password"
          />
        </InputGroup>
        {errors.password && (
          <ErrorMessage>{errors.password.message}</ErrorMessage>
        )}
      </FormRowVertical>

      <FormRowVertical>
        <label htmlFor="role">Role</label>
        <Select
          id="role"
          {...register("role", {
            required: "Role is required",
          })}
          disabled={isCreating}
          defaultValue="user"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        {errors.role && <ErrorMessage>{errors.role.message}</ErrorMessage>}
      </FormRowVertical>

      <Button type="submit" disabled={isCreating}>
        {isCreating ? <SpinnerMini /> : "Create User"}
      </Button>
    </FormContainer>
  );
}

export default UserCreateForm;