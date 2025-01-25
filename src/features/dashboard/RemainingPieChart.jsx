import { PieChart, Pie, Tooltip, Cell, Legend } from "recharts";
import GridBox from "../../ui/GridBox";
import Heading from "../../ui/Heading";
import { GridLayoutRight } from "../../ui/GridLayout2";

const data = [
  { name: "Action DASSAULT", dailyBudget: 500 },
  { name: "Livret Plango", dailyBudget: 750 },
  { name: "Action LVMH", dailyBudget: 500 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

function RemainingPieChart() {
  return (
    <GridLayoutRight>
      <GridBox>
        <Heading as="h2">Remaining Money</Heading>
        <text x="50%" y="15" textAnchor="middle" fontSize="1.6rem">
          Deposits over time
        </text>
        <PieChart width={400} height={400}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            label
            outerRadius={150}
            fill="#8884d8"
            dataKey="dailyBudget"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </GridBox>
    </GridLayoutRight>
  );
}

export default RemainingPieChart;
