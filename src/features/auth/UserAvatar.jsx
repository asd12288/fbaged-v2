import styled from "styled-components";
import { useUser } from "./useUser";

const StyledUserAvatar = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: center;
  font-weight: 500;
  font-size: 1.6rem;
  color: var(--color-grey-700);
`;

function UserAvatar() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <StyledUserAvatar>
      <span>Welcome back {user.username} </span>
    </StyledUserAvatar>
  );
}

export default UserAvatar;
