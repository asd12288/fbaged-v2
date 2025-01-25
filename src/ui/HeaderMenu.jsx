import styled from "styled-components";
import ButtonIcon from "./ButtonIcon";
import { HiOutlineUser } from "react-icons/hi";
import { BiLogOut } from "react-icons/bi";
import Logout from "./Logout";

const StyledHeaderMenu = styled.ul`
  display: flex;
  gap: 2.4rem;
`;

function HeaderMenu() {
  return (
    <StyledHeaderMenu>
      <li>
        <ButtonIcon onClick={() => console.log("click")}>
          <HiOutlineUser />
        </ButtonIcon>
      </li>
      <li>
        <Logout/>
      </li>
    </StyledHeaderMenu>
  );
}

export default HeaderMenu;
