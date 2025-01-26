import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GridBox from "../../../ui/GridBox";
import { useDeposits } from "../useDeposits";
import { format } from "date-fns";
import { useSearchParams } from "react-router";


function DepositChart() {
  const { isPending, data: deposits } = useDeposits();

  const [searchParams] = useSearchParams();

  const sortBy = searchParams.get("sortBy") || "date";
  const filterValue = searchParams.get("time") || "month";

  if (isPending) return <div>Loading...</div>;

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
    if (sortBy === "date") return new Date(a.dateAdded) - new Date(b.dateAdded);
  });

  return (
      <GridBox>
        <ResponsiveContainer>
          <BarChart
            width={600}
            height={400}
            data={sortedDeposits}
            margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
          >
            <text x="50%" y="15" textAnchor="middle" fontSize="1.6rem">
              Deposits over time
            </text>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateAdded"
              tickFormatter={(date) => format(new Date(date), "MMM dd")}
            />
            <YAxis tickFormatter={(value) => `$${value}`} dataKey="amount" />
            <Tooltip />
            <Legend />
            <Bar dataKey="amount" fill="#059669" name="Deposit Amount" />
          </BarChart>
        </ResponsiveContainer>
      </GridBox>
  );
}

export default DepositChart;
