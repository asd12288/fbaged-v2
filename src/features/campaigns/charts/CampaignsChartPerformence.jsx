import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from "recharts";
import GridBox from "../../../ui/GridBox";
import Heading from "../../../ui/Heading";
import { useCampaigns } from "../useCampaigns";
import { useState } from "react";
import styled from "styled-components";
import Spinner from "../../../ui/Spinner";
import { HiWallet } from "react-icons/hi2";
import Empty from "../../../ui/Empty";

const COLORS = ["#0369a1", "#059669", "#FFBB28", "#FF8042", ""];

const GridLayout = styled.div`
  grid-area: 3 / span 2;
`;

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
      >
        {`Leads ${value}`}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
      >
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

function CampaignsPerformence() {
  const { data: campaigns, isPending } = useCampaigns();
  const [activeIndex, setActiveIndex] = useState(0);

  // loading spinner
  if (isPending) return null;

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "Active" || campaign.status === "Learning"
  );

  const newData = activeCampaigns.map((campaign) => ({
    name: campaign.campaignName,
    value: campaign.results,
  }));

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <GridLayout>
      <GridBox>
        <Heading as="h2">Active Campaigns Performance</Heading>
        <div style={{ width: "100%", height: 400 }}>
          {activeCampaigns.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={newData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                >
                  {newData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </GridBox>
    </GridLayout>
  );
}

export default CampaignsPerformence;
