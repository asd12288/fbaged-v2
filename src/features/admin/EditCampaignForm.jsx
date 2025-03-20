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
  display: flex;
  flex-direction: row;
  gap: 1rem 5rem;
  padding: 2.4rem;
  background-color: var(--color-grey-100);
  border-radius: var(--border-radius-md);
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  flex: 1;
`;

const StyledSelect = styled.select`
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--color-grey-300);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-grey-0);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  width: 100%;
`;

const ErrorMessage = styled.p`
  color: var(--color-red-700);
  font-size: 1.2rem;
  margin-top: 0.5rem;
`;

const PreviewImage = styled.img`
  max-width: 200px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-grey-200);
  margin-top: 1rem;
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
  if (isPending) return <Spinner />;

  return (
    <GridBox>
      <Heading as="h2">Edit Campaign</Heading>
      <FormContainer onSubmit={handleSubmit(onSubmit)}>
        <Column>
          <FormRowVertical>
            <label>Campaign name</label>
            <Input
              {...register("campaignName", {
                required: "Campaign name is required",
              })}
            />
            {errors.campaignName && (
              <ErrorMessage>{errors.campaignName.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Status</label>
            <StyledSelect
              {...register("status", {
                required: "Status is required",
              })}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Learning">Learning</option>
              <option value="Canceled">Canceled</option>
            </StyledSelect>
            {errors.status && (
              <ErrorMessage>{errors.status.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Daily Budget</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("dailyBudget", {
                required: "Daily budget is required",
                min: {
                  value: 0,
                  message: "Daily budget must be a positive number",
                },
                valueAsNumber: true,
              })}
              disabled={isEditing}
            />
            {errors.dailyBudget && (
              <ErrorMessage>{errors.dailyBudget.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Results</label>
            <Input
              type="number"
              min="0"
              {...register("results", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.results && (
              <ErrorMessage>{errors.results.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Reaches</label>
            <Input
              type="number"
              min="0"
              {...register("reaches", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.reaches && (
              <ErrorMessage>{errors.reaches.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Impressions</label>
            <Input
              type="number"
              min="0"
              {...register("impressions", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.impressions && (
              <ErrorMessage>{errors.impressions.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Link Clicks</label>
            <Input
              type="number"
              min="0"
              {...register("linkClicks", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.linkClicks && (
              <ErrorMessage>{errors.linkClicks.message}</ErrorMessage>
            )}
          </FormRowVertical>
        </Column>

        <Column>
          <FormRowVertical>
            <label>Clicks</label>
            <Input
              type="number"
              min="0"
              {...register("clicks", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.clicks && (
              <ErrorMessage>{errors.clicks.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Cost per results</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("costPerResults", {
                valueAsNumber: true,
                min: 0,
              })}
            />
            {errors.costPerResults && (
              <ErrorMessage>{errors.costPerResults.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <FormRowVertical>
            <label>Image</label>
            <Input type="file" accept="image/*" {...register("image")} />
            {campaign?.image && (
              <PreviewImage src={campaign.image} alt="Campaign preview" />
            )}
            {errors.image && (
              <ErrorMessage>{errors.image.message}</ErrorMessage>
            )}
          </FormRowVertical>

          <Button type="submit" disabled={isEditing}>
            {isEditing ? <SpinnerMini /> : "Update Campaign"}
          </Button>
        </Column>
      </FormContainer>
    </GridBox>
  );
}

export default EditCampaignForm;
