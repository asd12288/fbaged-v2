import { useState } from "react";
import CampaignList from "../campaigns/fullCampaigns/CampaignList";
import Button from "../../ui/Button";
import EditCreateCampaignForm from "./EditCreateCampaignForm";
import { useCampaigns } from "../campaigns/useCampaigns";
import Heading from "../../ui/Heading";
import styled from "styled-components";
import { HiPlus, HiPencil, HiSearch } from "react-icons/hi";
import Spinner from "../../ui/Spinner";
import { formatCurrency } from "../../utils/helpers";
import Modal from "../../ui/Modal";

const ControlsContainer = styled.div`
  background-color: var(--color-grey-100);
  padding: 1.6rem;
  border-radius: var(--border-radius-md);
  margin-bottom: 2.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: center;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  min-width: 25rem;
  margin-left: 1.6rem;
`;

const CampaignSummary = styled.div`
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

const SearchContainer = styled.div`
  position: relative;
  max-width: 30rem;
`;

const SearchInput = styled.input`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  padding-left: 3.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  box-shadow: var(--shadow-sm);
  width: 100%;
`;

const SearchIcon = styled(HiSearch)`
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  color: var(--color-grey-500);
  width: 1.8rem;
  height: 1.8rem;
`;

function CampaignsAdminLayout() {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: campaigns, isPending } = useCampaigns();

  // Calculate campaign statistics
  let totalCampaigns = 0;
  let activeCampaigns = 0;
  let totalSpent = 0;
  let totalResults = 0;

  if (!isPending && campaigns) {
    totalCampaigns = campaigns.length;
    activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
    totalSpent = campaigns.reduce(
      (sum, campaign) => sum + Number(campaign.amountSpent || 0),
      0
    );
    totalResults = campaigns.reduce(
      (sum, campaign) => sum + Number(campaign.results || 0),
      0
    );
  }

  const handleCampaignChange = (event) => {
    setSelectedCampaignId(event.target.value);
  };

  // Filter campaigns based on search query
  const filteredCampaigns = !campaigns
    ? []
    : campaigns.filter((campaign) =>
        campaign.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <CampaignSummary>
        <SummaryCard color="var(--color-brand-600)">
          <h3>Total Campaigns</h3>
          <p>{isPending ? <Spinner /> : totalCampaigns}</p>
        </SummaryCard>

        <SummaryCard color="var(--color-green-700)">
          <h3>Active Campaigns</h3>
          <p>{isPending ? <Spinner /> : activeCampaigns}</p>
        </SummaryCard>

        <SummaryCard>
          <h3>Total Spent</h3>
          <p>{isPending ? <Spinner /> : formatCurrency(totalSpent)}</p>
        </SummaryCard>

        <SummaryCard>
          <h3>Total Results</h3>
          <p>{isPending ? <Spinner /> : totalResults}</p>
        </SummaryCard>
      </CampaignSummary>

      <ControlsContainer>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        <ControlButtons>
          {/* Edit Campaign Modal */}
          <Modal>
            <Modal.Open>
              <Button>
                <HiPencil />
                Edit Campaign
              </Button>
            </Modal.Open>
            <Modal.Window width="120rem">
              <div>
                <Heading as="h2">Choose Campaign to Edit</Heading>
                <StyledSelect
                  onChange={handleCampaignChange}
                  value={selectedCampaignId || ""}
                >
                  <option value="" disabled>
                    Select a campaign
                  </option>
                  {filteredCampaigns?.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.campaignName}
                    </option>
                  ))}
                </StyledSelect>

                {selectedCampaignId && (
                  <EditCreateCampaignForm id={selectedCampaignId} />
                )}
              </div>
            </Modal.Window>
          </Modal>

          {/* Add New Campaign Modal */}
          <Modal>
            <Modal.Open>
              <Button>
                <HiPlus />
                Add Campaign
              </Button>
            </Modal.Open>
            <Modal.Window width="120rem">
              <EditCreateCampaignForm />
            </Modal.Window>
          </Modal>
        </ControlButtons>
      </ControlsContainer>

      {/* Display campaigns list */}
      <CampaignList />
    </>
  );
}

export default CampaignsAdminLayout;
