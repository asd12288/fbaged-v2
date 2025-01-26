import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
  Brush,
} from "recharts";
import GridBox from "../../../ui/GridBox";
import { useCampaigns } from "../useCampaigns";

// Example data — replace this with whatever data-loading approach you use

const CampaignsPerforemenceAll = () => {
  const { data, isPending } = useCampaigns();

  return isPending ? (
    <div>loading...</div>
  ) : (
    <GridBox>
      <div style={{ width: "100%", height: 500 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {/* X-axis by campaign */}
            <XAxis dataKey="name" />
            {/* Left Y-axis for things like impressions/clicks/results */}
            <YAxis yAxisId="left" orientation="left" />
            {/* Right Y-axis for cost or spend data */}
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />

            {/* Bar for impressions */}
            <Bar
              yAxisId="left"
              dataKey="impressions"
              name="Impressions"
              fill="#059669"
              barSize={20}
            />
            {/* Line for clicks */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke="#82ca9d"
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            {/* Area for amount spent (using the right axis) */}
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="amountSpent"
              name="Amount Spent"
              fill="#a7f3d0"
              stroke="#065f46"
            />

            {/* Brush for zooming in/out if you have lots of data */}
            <Brush dataKey="name" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GridBox>
  );
};
export default CampaignsPerforemenceAll;
