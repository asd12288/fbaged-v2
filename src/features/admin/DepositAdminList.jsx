import React from "react";
import { useDeposits } from "../budget/useDeposits";
import { useEditDeposit } from "../budget/useEditDeposit";
import { useDeleteDeposit } from "../budget/useDeleteDeposit";

function DepositAdminList() {
  const { data: deposits, isPending } = useDeposits();
  const { editDeposit } = useEditDeposit();
  const { removeDeposit } = useDeleteDeposit();

  if (isPending) return <div>Loading...</div>;
  if (!deposits) return <div>No data</div>;

  return (
    <ul>
      {deposits.map((deposit) => (
        <li key={deposit.id}>
          {deposit.amount} - {deposit.type}
          <button
            onClick={() =>
              editDeposit({
                id: deposit.id,
                updatedDeposit: { amount: 999, type: "updated" },
              })
            }
          >
            Edit
          </button>
          <button onClick={() => removeDeposit(deposit.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}

export default DepositAdminList;