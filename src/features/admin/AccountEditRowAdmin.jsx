import React, { useState } from "react";
import Button from "../../ui/Button";
import Table from "../../ui/Table";
import toast from "react-hot-toast";
import useEditAccount from "../budget/useEditAccount";
import { deleteAccount } from "../../services/accountsApi";
import { formatCurrency } from "../../utils/helpers";
import styled from "styled-components";
import { HiPencil, HiTrash, HiCheck, HiX } from "react-icons/hi";
import Spinner from "../../ui/Spinner";

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 0.8rem;
  justify-content: center;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  font-size: 1.4rem;
  background-color: var(--color-grey-0);
`;

const ConfirmationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ConfirmationBox = styled.div`
  background-color: var(--color-grey-0);
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
  width: 40rem;
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  box-shadow: var(--shadow-lg);

  h3 {
    font-size: 1.8rem;
    color: var(--color-grey-700);
  }

  p {
    color: var(--color-grey-500);
  }
`;

const ConfirmButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1.2rem;
  margin-top: 1.2rem;
`;

function AccountEditRowAdmin({ account }) {
  const { editAccount, isEditing } = useEditAccount();
  const [editSession, setEditSession] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editData, setEditData] = useState({
    nameAccount: account.nameAccount,
    numAccounts: account.numAccounts,
    cost: account.cost,
  });

  const handleEditClick = () => {
    setEditSession(true);
  };

  const handleDeleteClick = () => {
    setConfirmDelete(true);
  };

  const confirmDeleteAccount = () => {
    setIsDeleting(true);
    deleteAccount(account.id, {
      onSuccess: () => {
        toast.success("Account deleted successfully");
        setConfirmDelete(false);
        setIsDeleting(false);
      },
      onError: () => {
        toast.error("Failed to delete account");
        setIsDeleting(false);
      },
    });
  };

  const handleSaveClick = () => {
    if (!editData.nameAccount.trim()) {
      toast.error("Account name cannot be empty");
      return;
    }

    if (editData.numAccounts <= 0) {
      toast.error("Number of accounts must be greater than 0");
      return;
    }

    if (editData.cost < 0) {
      toast.error("Cost cannot be negative");
      return;
    }

    editAccount(
      {
        id: account.id,
        updatedAccount: {
          ...editData,
          numAccounts: Number(editData.numAccounts),
          cost: Number(editData.cost),
        },
      },
      {
        onSuccess: () => {
          toast.success("Account updated successfully");
          setEditSession(false);
        },
        onError: () => {
          toast.error("Failed to update account");
        },
      }
    );
  };

  const handleCancelClick = () => {
    setEditSession(false);
    setEditData({
      nameAccount: account.nameAccount,
      numAccounts: account.numAccounts,
      cost: account.cost,
    });
  };

  return (
    <>
      <Table.Row key={account.id}>
        <td>
          {editSession ? (
            <StyledInput
              value={editData.nameAccount}
              onChange={(e) =>
                setEditData({ ...editData, nameAccount: e.target.value })
              }
            />
          ) : (
            account.nameAccount
          )}
        </td>
        <td>
          {editSession ? (
            <StyledInput
              type="number"
              min="1"
              value={editData.numAccounts}
              onChange={(e) =>
                setEditData({ ...editData, numAccounts: e.target.value })
              }
            />
          ) : (
            account.numAccounts
          )}
        </td>
        <td>
          {editSession ? (
            <StyledInput
              type="number"
              step="0.01"
              min="0"
              value={editData.cost}
              onChange={(e) =>
                setEditData({ ...editData, cost: e.target.value })
              }
            />
          ) : (
            formatCurrency(account.cost)
          )}
        </td>
        <td>
          {editSession ? (
            <ActionButtonsContainer>
              <Button
                size="small"
                variant="primary"
                onClick={handleSaveClick}
                disabled={isEditing}
                title="Save"
              >
                {isEditing ? <Spinner /> : <HiCheck />}
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={handleCancelClick}
                title="Cancel"
              >
                <HiX />
              </Button>
            </ActionButtonsContainer>
          ) : (
            <ActionButtonsContainer>
              <Button
                size="small"
                variant="primary"
                onClick={handleEditClick}
                title="Edit"
              >
                <HiPencil />
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={handleDeleteClick}
                title="Delete"
              >
                <HiTrash />
              </Button>
            </ActionButtonsContainer>
          )}
        </td>
      </Table.Row>

      {confirmDelete && (
        <ConfirmationOverlay>
          <ConfirmationBox>
            <h3>Confirm Deletion</h3>
            <p>
              Are you sure you want to delete the account "{account.nameAccount}
              "? This action cannot be undone.
            </p>
            <ConfirmButtonContainer>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner /> : "Delete"}
              </Button>
            </ConfirmButtonContainer>
          </ConfirmationBox>
        </ConfirmationOverlay>
      )}
    </>
  );
}

export default AccountEditRowAdmin;
