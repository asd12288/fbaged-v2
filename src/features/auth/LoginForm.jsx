import Form from "../../ui/Form";
import Input from "../../ui/Input";
import FormRowVertical from "../../ui/FormRowVertical";
import Button from "../../ui/Button";
import { useLogin } from "./useLogin";
import { useState } from "react";
import SpinnerMini from "../../ui/SpinnerMini";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isPending } = useLogin();

  function handleSubmit(event) {
    event.preventDefault();

    if (!email || !password) return;

    login(
      { email, password },
      {
        onSettled: () => {
          setEmail("");
          setPassword("");
        },
      }
    );
  }

  return (
    <Form type="regular" onSubmit={handleSubmit}>
      <FormRowVertical label="Email">
        <Input
          type="text"
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          htmlFor="email"
          autoComplete="email"
          placeholder="Email"
        />
      </FormRowVertical>
      <FormRowVertical label="Password">
        <Input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          htmlFor="password"
          autoComplete="current-password"
          disabled={isPending}
          placeholder="Password"
        />
      </FormRowVertical>
      <FormRowVertical>
        <Button>{isPending ? <SpinnerMini /> : "Login"}</Button>
      </FormRowVertical>
    </Form>
  );
}

export default LoginForm;
