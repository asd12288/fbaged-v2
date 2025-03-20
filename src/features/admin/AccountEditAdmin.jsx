import { useState } from "react";
import Table from "../../ui/Table";
import { useAccounts } from "../budget/useAccounts";
import AccountEditRowAdmin from "./AccountEditRowAdmin";
import styled from "styled-components";
import Spinner from "../../ui/Spinner";
import { HiSearch } from "react-icons/hi";
import { formatCurrency } from "../../utils/helpers";

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
`;

const SearchInput = styled.input`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  padding-left: 3.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  box-shadow: var(--shadow-sm);
  width: 30rem;
`;

const SearchWrapper = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 50%;
    left: 1rem;
    transform: translateY(-50%);
    color: var(--color-grey-500);
    width: 1.8rem;
    height: 1.8rem;
  }
`;

const SummaryContainer = styled.div`
  display: flex;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
`;

const SummaryCard = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  padding: 1.6rem;
  flex: 1;
  box-shadow: var(--shadow-sm);

  h3 {
    font-size: 1.4rem;
    color: var(--color-grey-500);
    margin-bottom: 0.8rem;
  }

  p {
    font-size: 2rem;
    font-weight: 600;
    color: ${(props) => props.color || "var(--color-grey-700)"};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3.2rem;
  color: var(--color-grey-500);

  h4 {
    font-size: 1.8rem;
    margin-bottom: 0.8rem;
  }

  p {
    font-size: 1.4rem;
  }
`;

function AccountEditAdmin() {
  const { data: accounts, isPending } = useAccounts();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter accounts based on search query
  const filteredAccounts =
    searchQuery.trim() === ""
      ? accounts
      : accounts?.filter((account) =>
          account.nameAccount.toLowerCase().includes(searchQuery.toLowerCase())
        );

  // Calculate summary statistics
  let totalAccounts = 0;
  let totalCost = 0;

  if (!isPending && accounts) {
    totalAccounts = accounts.reduce(
      (sum, account) => sum + Number(account.numAccounts),
      0
    );
    totalCost = accounts.reduce(
      (sum, account) =>
        sum + Number(account.numAccounts) * Number(account.cost),
      0
    );
  }

  if (isPending) return <Spinner />;

  return (
    <div>
      <SummaryContainer>
        <SummaryCard color="var(--color-brand-600)">
          <h3>Total Accounts</h3>
          <p>{totalAccounts}</p>
        </SummaryCard>

        <SummaryCard color="var(--color-green-700)">
          <h3>Account Types</h3>
          <p>{accounts.length}</p>
        </SummaryCard>

        <SummaryCard>
          <h3>Total Cost</h3>
          <p>{formatCurrency(totalCost)}</p>
        </SummaryCard>
      </SummaryContainer>

      <SearchContainer>
        <SearchWrapper>
          <HiSearch />
          <SearchInput
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>
      </SearchContainer>

      {filteredAccounts.length === 0 ? (
        <EmptyState>
          <h4>No accounts found</h4>
          <p>
            {searchQuery
              ? "Try adjusting your search query"
              : "Add some accounts to get started"}
          </p>
        </EmptyState>
      ) : (
        <Table columns="2fr 1fr 1fr 1fr" type="compact">
          <Table.Header>
            <th>Account name</th>
            <th>Number of accounts</th>
            <th>Cost</th>
            <th>Actions</th>
          </Table.Header>
          <Table.Body
            data={filteredAccounts}
            render={(account) => (
              <AccountEditRowAdmin key={account.id} account={account} />
            )}
          />
        </Table>
      )}
    </div>
  );
}

export default AccountEditAdmin;
