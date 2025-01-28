import { HiOutlineLogout } from "react-icons/hi";
import ButtonIcon from "./ButtonIcon";
import { useLogout } from "../features/auth/useLogout";
import SpinnerMini from "./SpinnerMini";

function Logout() {
  const { logout, isPending } = useLogout();

  function handleClick() {
    logout();
  }

  return (
    <ButtonIcon onClick={handleClick}>
      {isPending ? <SpinnerMini /> : <HiOutlineLogout />}
    </ButtonIcon>
  );
}

export default Logout;
