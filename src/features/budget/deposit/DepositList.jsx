import Table from "../../../ui/Table";
import DepositRow from "./DepositRow";
import { useDeposits } from "../useDeposits";
import styled from "styled-components";
import { useSearchParams } from "react-router";
import Heading from "../../../ui/Heading";
import GridBox from "../../../ui/GridBox";

const StyledDepositList = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #fff;
  padding:2.4rem;
  border-radius: var(--border-radius-md);

  /* grid-area: 1 / span 2; */
  overflow: auto; /* Allows scrolling */
  scrollbar-width: none; /* Hides scrollbar in Firefox */
  -ms-overflow-style: none; /* Hides scrollbar in IE and Edge */

  &::-webkit-scrollbar {
    display: none; /* Hides scrollbar in Chrome, Safari, and Edge */
  }
`;

function DepositList() {
  const { isPending, data: deposits } = useDeposits();
  const [searchParams] = useSearchParams();

  if (isPending) return <div>Loading...</div>;

  const sortBy = searchParams.get("sortBy") || "date";
  const filterValue = searchParams.get("time") || "month";

  let filteredDeposits;

  if (filterValue === "all") filteredDeposits = deposits;

  if (filterValue === "month") {
    filteredDeposits = deposits.filter(
      (deposit) =>
        new Date(deposit.dateAdded) >=
        new Date().setMonth(new Date().getMonth() - 1)
    );
  }

  if (filterValue === "year") {
    filteredDeposits = deposits.filter(
      (deposit) =>
        new Date(deposit.dateAdded) >=
        new Date().setFullYear(new Date().getFullYear() - 1)
    );
  }

  if (filterValue === "week") {
    filteredDeposits = deposits.filter(
      (deposit) =>
        new Date(deposit.dateAdded) >=
        new Date().setDate(new Date().getDate() - 7)
    );
  }

  const sortedDeposits = [...filteredDeposits].sort((a, b) => {
    if (sortBy === "asc") return b.amount - a.amount;
    if (sortBy === "des") return a.amount - b.amount;
    if (sortBy === "date") return new Date(b.dateAdded) - new Date(a.dateAdded);
  });

  return (
    <StyledDepositList>
      <Heading as="h2">Lateset Deposits</Heading>
      <Table columns="1fr 1fr 1fr 1.1rem" type="center">
        <Table.Header>
          <div>deposit</div>
          <div>Type</div>
          <div>Date</div>
        </Table.Header>

        <Table.Body
          data={sortedDeposits}
          render={(deposit) => <DepositRow deposit={deposit} />}
        />
      </Table>
    </StyledDepositList>
  );
}

export default DepositList;
