import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import GridBox from "../../ui/GridBox";

const data = [
  { name: "Action DASSAULT", cpr: 29.98 },
  { name: "Livret Plango", cpr: 32.33 },
  { name: "Action LVMH", cpr: 29.54 },
];

function CampaignLineChart() {
  return (
    <GridBox>
      <text x="50%" y="15" textAnchor="middle" fontSize="1.6rem">
            Deposits over time
          </text>
      <LineChart
        width={600}
        height={300}
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="cpr"
          stroke="#8884d8"
          name="Cost Per Result"
        />
      </LineChart>
    </GridBox>
  );
}

export default CampaignLineChart;
