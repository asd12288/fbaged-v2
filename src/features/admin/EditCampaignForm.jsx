import { useEffect } from "react";
import { useForm } from "react-hook-form";
import styled from "styled-components";

import GridBox from "../../ui/GridBox";
import Heading from "../../ui/Heading";
import FormRowVertical from "../../ui/FormRowVertical";
import Input from "../../ui/Input";
import { useCampaign } from "../campaigns/useCampaign";
import Button from "../../ui/Button";
import { useEditCampaign } from "../campaigns/useEditCampaign";
import SpinnerMini from "../../ui/SpinnerMini";
import toast from "react-hot-toast";

// ----------------- STYLED COMPONENTS -----------------
const FormContainer = styled.form`
  /* Use flex to place columns side by side */
  display: flex;
  flex-direction: row;
  gap: 1rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-100);
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid;
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
`;

// ----------------- COMPONENT -----------------
function EditCampaignForm() {
  const { data: campaign, isPending } = useCampaign("1");
  const { isEditing, editCampaign } = useEditCampaign();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!isPending && campaign) {
      reset({
        campaignName: campaign.campaignName ?? "",
        status: campaign.status ?? "Active",
        dailyBudget: campaign.dailyBudget ?? 0,
        results: campaign.results ?? 0,
        reaches: campaign.reaches ?? 0,
        impressions: campaign.impressions ?? 0,
        linkClicks: campaign.linkClicks ?? 0,
        clicks: campaign.clicks ?? 0,
        costPerResults: campaign.costPerResults ?? 0,
        // We will calculate these so start them at 0
        cpm: 0,
        cpc: 0,
        ctr: 0,
      });
    }
  }, [campaign, isPending, reset]);

  // ----------------- SUBMIT HANDLER -----------------
  const onSubmit = (data) => {
    // Calculate derived metrics on the fly
    const finalData = {
      ...data,
      cpm:
        data.impressions > 0
          ? Number(((data.costPerResults / data.impressions) * 1000).toFixed(2))
          : 0,
      cpc:
        data.clicks > 0
          ? Number((data.costPerResults / data.clicks).toFixed(2))
          : 0,
      ctr:
        data.impressions > 0
          ? Number(((data.clicks / data.impressions) * 100).toFixed(2))
          : 0,
    };

    const image = typeof data.image === "string" ? data.image : data.image[0];
    editCampaign(
      { newCampaign: { ...finalData, image }, id: campaign.id },
      {
        onSuccess: () => {
          reset();
          toast.success("Campaign updated successfully");
        },
      }
    );
  };

  // ----------------- RENDER -----------------
  if (isPending) return <div>Loading...</div>;

  return (
    <GridBox>
      <Heading as="h2">Edit form</Heading>
      <FormContainer onSubmit={handleSubmit(onSubmit)}>
        <Column>
          <FormRowVertical>
            <label>Campaign name</label>
            <Input {...register("campaignName")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Status</label>
            <StyledSelect {...register("status")}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Learning">Learning</option>
              <option value="Canceled">Canceled</option>
            </StyledSelect>
          </FormRowVertical>

          <FormRowVertical>
            <label>Daily Budget</label>
            <Input
              type="number"
              {...register("dailyBudget")}
              disabled={isEditing}
            />
          </FormRowVertical>

          <FormRowVertical>
            <label>Results</label>
            <Input type="number" {...register("results")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Reaches</label>
            <Input type="number" {...register("reaches")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Impressions</label>
            <Input type="number" {...register("impressions")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Link Clicks</label>
            <Input type="number" {...register("linkClicks")} />
          </FormRowVertical>
        </Column>

        <Column>
          <FormRowVertical>
            <label>Clicks</label>
            <Input type="number" {...register("clicks")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Cost per results</label>
            <Input type="float" {...register("costPerResults")} />
          </FormRowVertical>

          <FormRowVertical>
            <label>Image</label>
            <Input type="file" {...register("image")} />
            {campaign?.image && (
              <img
                src={campaign.image}
                style={{ width: "200px", marginTop: "1rem" }}
              />
            )}
          </FormRowVertical>

          <Button type="submit">
            {isEditing ? <SpinnerMini /> : "Submit"}
          </Button>
        </Column>
      </FormContainer>
    </GridBox>
  );
}

export default EditCampaignForm;
