import React, { useState } from "react";
import Button from "../../ui/Button";
import Table from "../../ui/Table";
import toast from "react-hot-toast";
import useEditAccount from "../budget/useEditAccount";
import { deleteAccount } from "../../services/accountsApi";

function AccountEditRowAdmin({ account }) {
  const { editAccount } = useEditAccount();
  const [editSession, setEditSession] = useState(false);
  const [editData, setEditData] = useState({
    nameAccount: account.nameAccount,
    numAccounts: account.numAccounts,
    cost: account.cost,
  });

  const handleEditClick = () => {
    setEditSession(true);
  };

  const handleDeleteClick = (id) => {
    deleteAccount(id);
  };

  const handleSaveClick = () => {
    editAccount({ id: account.id, updatedAccount: editData });
    setEditSession(false);
    toast.success("Account updated!");
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
    <Table.Row key={account.id}>
      <td>
        {editSession ? (
          <input
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
          <input
            type="number"
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
          <input
            type="number"
            value={editData.cost}
            onChange={(e) => setEditData({ ...editData, cost: e.target.value })}
          />
        ) : (
          account.cost
        )}
      </td>
      <td>
        {editSession ? (
          <>
            <Button size="small" onClick={handleSaveClick}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelClick}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="small" onClick={handleEditClick}>
              Edit
            </Button>
            <Button size="small" onClick={() => handleDeleteClick(account.id)}>
              Delete
            </Button>
          </>
        )}
      </td>
    </Table.Row>
  );
}

export default AccountEditRowAdmin;
