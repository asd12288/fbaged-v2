import { useState } from "react";
import DepositAdminForm from "./DepositAddAdminForm";
import Table from "../../ui/Table";
import { useEditDeposit } from "../budget/useEditDeposit";
import { useDeleteDeposit } from "../budget/useDeleteDeposit";
import { useDeposits } from "../budget/useDeposits";
import Button from "../../ui/Button";
import { formatCurrency } from "../../utils/helpers";

function DepositEditAdmin() {
  const { data: deposits, isPending } = useDeposits();
  const { editDeposit } = useEditDeposit();
  const { removeDeposit } = useDeleteDeposit();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEditClick = (deposit) => {
    setEditingId(deposit.id);
    setEditData(deposit);
  };

  const handleDeleteClick = (id) => {
    removeDeposit(id);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editDeposit({ id: editingId, updatedDeposit: editData });
    setEditingId(null);
    setEditData({});
  };

  if (isPending) return <div>Loading...</div>;

  return (
    <div>
      <Table columns="1fr 1fr 1fr 1.2fr" type="compact">
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
                  />
                ) : (
                  deposit.dateAdded
                )}
              </td>
              <td>
                {editingId === deposit.id ? (
                  <Button size="small" onClick={handleEditSubmit}>
                    Save
                  </Button>
                ) : (
                  <>
                    <Button
                      size="small"
                      onClick={() => handleEditClick(deposit)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleDeleteClick(deposit.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </td>
            </Table.Row>
          )}
        />
      </Table>
    </div>
  );
}

export default DepositEditAdmin;
