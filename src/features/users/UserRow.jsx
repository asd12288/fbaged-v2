import styled from "styled-components";
import Table from "../../ui/Table";
import { HiPencil, HiTrash } from "react-icons/hi";
import { formatDistanceToNow } from "date-fns";
import { useDeleteUser } from "./useDeleteUser";
import ButtonIcon from "../../ui/ButtonIcon";
import Modal from "../../ui/Modal";
import { useState } from "react";
import SpinnerMini from "../../ui/SpinnerMini";

const Username = styled.div`
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-grey-600);
`;

const Email = styled.div`
  font-family: "Sono";
  font-weight: 500;
  color: var(--color-grey-500);
`;

const Role = styled.span`
  width: fit-content;
  text-transform: uppercase;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.4rem 1.2rem;
  border-radius: var(--border-radius-sm);
  
  color: ${(props) =>
    props.type === "admin" ? "var(--color-red-700)" : "var(--color-green-700)"};
  background-color: ${(props) =>
    props.type === "admin" ? "var(--color-red-100)" : "var(--color-green-100)"};
`;

const Created = styled.div`
  font-weight: 500;
  color: var(--color-grey-500);
`;

const Actions = styled.div`
  display: flex;
  gap: 1.2rem;
`;

const ConfirmDelete = styled.div`
  width: 40rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;

  & p {
    color: var(--color-grey-500);
    margin-bottom: 1.2rem;
  }

  & div {
    display: flex;
    justify-content: flex-end;
    gap: 1.2rem;
  }
`;

const Button = styled.button`
  background: none;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  padding: 1.2rem 1.6rem;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background-color: var(--color-grey-50);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const DeleteButton = styled(Button)`
  color: var(--color-red-700);
  border-color: var(--color-red-300);

  &:hover:not(:disabled) {
    background-color: var(--color-red-100);
  }
`;

function UserRow({ user }) {
  const { removeUser, isDeleting } = useDeleteUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    removeUser(user.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  return (
    <Table.Row>
      <div>
        <Username>{user.username}</Username>
        <Email>{user.email}</Email>
      </div>

      <Role type={user.role}>{user.role}</Role>

      <Created>
        {formatDistanceToNow(new Date(user.created_at), {
          addSuffix: true,
        })}
      </Created>

      <Actions>
        <ButtonIcon>
          <HiPencil />
        </ButtonIcon>

        <Modal>
          <Modal.Open opens="delete">
            <ButtonIcon>
              <HiTrash />
            </ButtonIcon>
          </Modal.Open>
          
          <Modal.Window name="delete">
            <ConfirmDelete>
              <h3>Delete User</h3>
              <p>
                Are you sure you want to permanently delete <strong>{user.username}</strong>? 
                This action cannot be undone.
              </p>

              <div>
                <Button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <DeleteButton
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <SpinnerMini /> : "Delete"}
                </DeleteButton>
              </div>
            </ConfirmDelete>
          </Modal.Window>
        </Modal>
      </Actions>
    </Table.Row>
  );
}

export default UserRow;