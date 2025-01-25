import styled from "styled-components";

const StyledUserAvatar = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: center;
  font-weight: 500;
  font-size: 1.6rem;
  color: var(--color-grey-700);
`;

const UserAvatarImg = styled.img`
  width: 4.8rem;
  height: 4.8rem;
  border-radius: 50%;
`;

function UserAvatar() {
  return <StyledUserAvatar>
    <span>Welcome back Admin</span>
  </StyledUserAvatar>;
}

export default UserAvatar;
