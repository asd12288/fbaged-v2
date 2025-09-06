import { useState } from "react";
import DepositAdminForm from "./DepositAddAdminForm";
import Table from "../../ui/Table";
import { useEditDeposit } from "../budget/useEditDeposit";
import { useDeleteDeposit } from "../budget/useDeleteDeposit";
import { useDeposits } from "../budget/useDeposits";
import { useAdminScope } from "./AdminScopeContext";
import Button from "../../ui/Button";
import { formatCurrency } from "../../utils/helpers";
import styled from "styled-components";
import { HiPencil, HiTrash } from "react-icons/hi";
import Spinner from "../../ui/Spinner";
import toast from "react-hot-toast";

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 0.8rem;
  justify-content: center;
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

function DepositEditAdmin() {
  const { selectedUserId } = useAdminScope();
  const { data: deposits, isPending } = useDeposits({
    filterUserId: selectedUserId,
  });
  const { editDeposit, isEditing } = useEditDeposit();
  const { removeDeposit, isDeleting } = useDeleteDeposit();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleEditClick = (deposit) => {
    setEditingId(deposit.id);
    setEditData(deposit);
  };

  const handleDeleteClick = (deposit) => {
    setConfirmDelete(deposit);
  };

  const confirmDeleteDeposit = () => {
    removeDeposit(confirmDelete.id, {
      onSuccess: () => {
        toast.success("Deposit deleted successfully");
        setConfirmDelete(null);
      },
      onError: () => {
        toast.error("Failed to delete deposit");
      },
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editDeposit(
      { id: editingId, updatedDeposit: editData },
      {
        onSuccess: () => {
          toast.success("Deposit updated successfully");
          setEditingId(null);
          setEditData({});
        },
        onError: () => {
          toast.error("Failed to update deposit");
        },
      }
    );
  };

  if (isPending) return <Spinner />;

  return (
    <div>
      <Table columns="1fr 1fr 1fr 1fr" type="compact">
        <Table.Header>
          <th>Amount</th>
          <th>Type</th>
          <th>Date</th>
          <th>Actions</th>
        </Table.Header>
        <Table.Body
          data={deposits}
          render={(deposit) => (
            <Table.Row key={deposit.id}>
              <td>
                {editingId === deposit.id ? (
                  <input
                    value={editData.amount}
                    onChange={(e) =>
                      setEditData({ ...editData, amount: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      border: "1px solid var(--color-grey-300)",
                      borderRadius: "var(--border-radius-sm)",
                    }}
                  />
                ) : (
                  formatCurrency(deposit.amount)
                )}
              </td>
              <td>
                {editingId === deposit.id ? (
                  <select
                    value={editData.type}
                    onChange={(e) =>
                      setEditData({ ...editData, type: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      border: "1px solid var(--color-grey-300)",
                      borderRadius: "var(--border-radius-sm)",
                    }}
                  >
                    <option value="crypto">Crypto</option>
                    <option value="bank">Bank transfer</option>
                    <option value="credit">Credit card</option>
                  </select>
                ) : (
                  deposit.type
                )}
              </td>
              <td>
                {editingId === deposit.id ? (
                  <input
                    type="date"
                    value={editData.dateAdded}
                    onChange={(e) =>
                      setEditData({ ...editData, dateAdded: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "0.8rem",
                      border: "1px solid var(--color-grey-300)",
                      borderRadius: "var(--border-radius-sm)",
                    }}
                  />
                ) : (
                  deposit.dateAdded
                )}
              </td>
              <td>
                {editingId === deposit.id ? (
                  <ActionButtonsContainer>
                    <Button
                      size="small"
                      onClick={handleEditSubmit}
                      disabled={isEditing}
                    >
                      {isEditing ? <Spinner /> : "Save"}
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </ActionButtonsContainer>
                ) : (
                  <ActionButtonsContainer>
                    <Button
                      size="small"
                      onClick={() => handleEditClick(deposit)}
                      title="Edit"
                    >
                      <HiPencil />
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleDeleteClick(deposit)}
                      title="Delete"
                    >
                      <HiTrash />
                    </Button>
                  </ActionButtonsContainer>
                )}
              </td>
            </Table.Row>
          )}
        />
      </Table>

      {confirmDelete && (
        <ConfirmationOverlay>
          <ConfirmationBox>
            <h3>Confirm Deletion</h3>
            <p>
              Are you sure you want to delete the{" "}
              {formatCurrency(confirmDelete.amount)} deposit from{" "}
              {confirmDelete.dateAdded}? This action cannot be undone.
            </p>
            <ConfirmButtonContainer>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteDeposit}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner /> : "Delete"}
              </Button>
            </ConfirmButtonContainer>
          </ConfirmationBox>
        </ConfirmationOverlay>
      )}
    </div>
  );
}

export default DepositEditAdmin;
