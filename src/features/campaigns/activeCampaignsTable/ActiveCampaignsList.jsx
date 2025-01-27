import styled from "styled-components";
import Table from "../../../ui/Table";
import { useCampaigns } from "../useCampaigns";
import ActiveCampaignsRow from "./ActiveCampaignsRow";
import Heading from "../../../ui/Heading";
import Row from "../../../ui/Row";
import { Link } from "react-router";
import Empty from "../../../ui/Empty";

const FullTableGrid = styled.div`
  grid-area: 4 / span 4 / auto / span 4;
`;

const StyledLink = styled(Link)`
  color: var(--color-brand-700);

  &:hover {
    text-decoration: underline;
  }
`;

function ActiveCampaigns() {
  const { isPending, data: campaigns } = useCampaigns();

  if (isPending) return <div>Loading...</div>;
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "Active"
  );

  return (
    <FullTableGrid>
      <Row>
        <Heading as="h2">
          Active Campaigns {new Date().toLocaleDateString()}
        </Heading>
        <StyledLink to="/campaigns">
          <p>All Campaigns</p>
        </StyledLink>
      </Row>
      <Table columns="1.5fr 1fr 1fr 1fr 1fr 1fr">
        <Table.Header>
          <div>Campaign Name</div>
          <div>Results</div>

          <div>CPR</div>

          <div>Daily budget</div>
          <div>Clicks</div>
          <div>Campaign Preview</div>
        </Table.Header>
        <Table.Body
          data={activeCampaigns}
          render={(campaign) => <ActiveCampaignsRow campaign={campaign} />}
        />
      </Table>
    </FullTableGrid>
  );
}

export default ActiveCampaigns;
