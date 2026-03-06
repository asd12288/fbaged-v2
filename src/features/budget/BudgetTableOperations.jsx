import SortBy from "../../ui/SortBy";
import TableOperations from "../../ui/TableOperations";
import Filter from "../../ui/Filter";

function BudgetTableOperations() {
  return (
    <TableOperations>
      <Filter
        filterField="time"
        options={[
          { value: "week", label: "This Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
          { value: "all", label: "All Time" },
        ]}
      />
      <SortBy
        options={[
          { value: "asc", label: "Sort by Amount (High First)" },
          { value: "des", label: "Sort by Amount (Small First)" },
          { value: "date", label: "Sort by Date" }, // default
        ]}
      />
    </TableOperations>
  );
}

export default BudgetTableOperations;
