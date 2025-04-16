import React, { useState } from "react";
import styled from "styled-components";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useCampaigns } from "../useCampaigns";
import Spinner from "../../../ui/Spinner";
import { formatCurrency } from "../../../utils/helpers";
import { HiChartBar, HiChartPie } from "react-icons/hi";

const ChartContainer = styled.div`
  background-color: var(--color-grey-0);
  border: 1px solid var(--color-grey-200);
  border-radius: var(--border-radius-md);
  padding: 2.4rem;
`;

const Header = styled.div`
  margin-bottom: 2.4rem;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
`;

const ChartTypeButton = styled.button`
  background: ${(props) =>
    props.active ? "var(--color-brand-600)" : "var(--color-grey-0)"};
  color: ${(props) =>
    props.active ? "var(--color-grey-0)" : "var(--color-grey-600)"};
  border: 1px solid var(--color-grey-200);
  padding: 0.6rem 1.2rem;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: var(--color-brand-600);
    color: var(--color-grey-0);
  }

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1.6rem;
`;

function CampaignsPerformanceAll() {
  const [viewType, setViewType] = useState("performance"); // performance or costs
  const { data: campaigns, isPending } = useCampaigns();

  if (isPending) return <Spinner />;

  const chartData = campaigns?.map((campaign) => ({
    name: campaign.campaignName.substring(0, 20), // Truncate long names
    results: campaign.results || 0,
    dailyResults: campaign.dailyResults || 0,
    cost: campaign.costPerResults || 0,
    spent: campaign.amountSpent || 0,
    reaches: campaign.reaches || 0,
    impressions: campaign.impressions || 0,
  }));

  const renderPerformanceChart = (
    <ComposedChart data={chartData} height={400}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="name"
        angle={-45}
        textAnchor="end"
        height={60}
        interval={0}
        tick={{ fontSize: 12 }}
      />
      <YAxis
        yAxisId="left"
        orientation="left"
        tickFormatter={(value) => value.toLocaleString()}
      />
      <YAxis
        yAxisId="right"
        orientation="right"
        tickFormatter={(value) => formatCurrency(value)}
      />
      <Tooltip
        formatter={(value, name) => {
          if (name === "cost" || name === "spent") {
            return formatCurrency(value);
          }
          return value.toLocaleString();
        }}
      />
      <Legend />
      <Bar
        dataKey="results"
        fill="#4f46e5"
        yAxisId="left"
        name="Total Results"
      />
      <Line
        type="monotone"
        dataKey="dailyResults"
        stroke="#059669"
        yAxisId="left"
        name="Daily Results"
        strokeWidth={2}
      />
      <Line
        type="monotone"
        dataKey="reaches"
        stroke="#0891b2"
        yAxisId="left"
        name="Reaches"
        strokeWidth={2}
      />
    </ComposedChart>
  );

  const renderCostChart = (
    <ComposedChart data={chartData} height={400}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="name"
        angle={-45}
        textAnchor="end"
        height={60}
        interval={0}
        tick={{ fontSize: 12 }}
      />
      <YAxis tickFormatter={(value) => formatCurrency(value)} />
      <Tooltip formatter={(value) => formatCurrency(value)} />
      <Legend />
      <Bar dataKey="spent" fill="#be123c" name="Amount Spent" />
      <Line
        type="monotone"
        dataKey="cost"
        stroke="#86198f"
        name="Cost per Result"
        strokeWidth={2}
      />
    </ComposedChart>
  );

  return (
    <ChartContainer>
      <Header>
        <Title>Campaign Performance Overview</Title>
        <ButtonGroup>
          <ChartTypeButton
            active={viewType === "performance"}
            onClick={() => setViewType("performance")}
          >
            <HiChartBar />
            Performance Metrics
          </ChartTypeButton>
          <ChartTypeButton
            active={viewType === "costs"}
            onClick={() => setViewType("costs")}
          >
            <HiChartPie />
            Cost Analysis
          </ChartTypeButton>
        </ButtonGroup>
      </Header>

      <div style={{ width: "100%", height: "500px" }}>
        <ResponsiveContainer>
          {viewType === "performance"
            ? renderPerformanceChart
            : renderCostChart}
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

export default CampaignsPerformanceAll;
