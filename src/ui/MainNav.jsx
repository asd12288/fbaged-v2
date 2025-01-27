import { NavLink } from "react-router";
import styled from "styled-components";
import {
  HiMiniCursorArrowRays,
  HiOutlineBanknotes,
  HiOutlineHome,
  HiOutlineUser,
} from "react-icons/hi2";
import { useUser } from "../features/auth/useUser";

const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 0;
`;

const StyledNavLink = styled(NavLink)`
  &:link,
  &:visited {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    color: var(--color-brand-900);
    font-size: 1.6rem;
    font-weight: 500;
    padding: 1.2rem 1.2rem;
    transition: all 0.3s;
  }

  &:hover,
  &:active,
  &.active:link,
  &.active:visited {
    color: var(--color-brand-600);
    background-color: var(--color-grey-100);
    border-radius: var(--border-radius-sm);
  }

  & svg {
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-grey-600);
    transition: all 0.3s;
  }

  &:hover svg,
  &:active svg,
  &.active svg,
  &.active:visited svg {
    color: var(--color-brand-900);
  }
`;

function MainNav() {
  const { user } = useUser();

  return (
    <nav>
      <NavList>
        <li>
          <StyledNavLink to="/dashboard" activeClassName="active">
            <HiOutlineHome />
            <span>Dasboard</span>
          </StyledNavLink>
        </li>
        <li>
          <StyledNavLink to="/campaigns" activeClassName="active">
            <HiMiniCursorArrowRays />
            <span>Campaigns</span>
          </StyledNavLink>
        </li>
        <li>
          <StyledNavLink to="/budget" activeClassName="active">
            <HiOutlineBanknotes />
            <span>Budget</span>
          </StyledNavLink>
        </li>
        {user.role === "admin" ? (
          <li>
            <StyledNavLink to="/admin-dashboard" activeClassName="active">
              <HiOutlineUser />
              <span>Admin</span>
            </StyledNavLink>
          </li>
        ) : null}
      </NavList>
    </nav>
  );
}

export default MainNav;
