import supabase, { supabaseUrl } from "./supabase";

export async function getCampaigns() {
  const { data, error } = await supabase.from("campaigns").select("*");
  if (error) {
    console.log(error);
    throw new Error(error.message);
  }
  return data;
}

export async function getCampaign(id) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id);

  if (error) {
    console.log(error);
    throw new Error(error.message);
  }
  return data;
}

export async function createEditCampaign(newCampaign, id) {
  let query = supabase.from("campaigns");

  // Make a copy so we can remove the image field if it's null/undefined
  const finalCampaign = { ...newCampaign };

  // If no new image, remove the image field to avoid overwriting
  if (!finalCampaign.image) {
    delete finalCampaign.image;

    if (!id) {
      query = query.insert([{ ...finalCampaign }]);
    } else {
      query = query.update({ ...finalCampaign }).eq("id", id);
    }
  } else {
    const hasImagePath =
      typeof finalCampaign.image === "string" &&
      finalCampaign.image?.startsWith(supabaseUrl);
    const imageName =
      typeof finalCampaign.image === "string"
        ? `${Math.random()}-${finalCampaign.image}`.replaceAll("/", "")
        : `${Math.random()}-${
            finalCampaign.image?.name ?? "no-image"
          }`.replaceAll("/", "");
    const imagePath = hasImagePath
      ? finalCampaign.image
      : `${supabaseUrl}/storage/v1/object/public/photos/${imageName}`;

    if (!id) {
      query = query.insert([
        {
          ...finalCampaign,
          image: imagePath,
        },
      ]);
    } else {
      query = query.update({ ...finalCampaign, image: imagePath }).eq("id", id);
    }

    const { error: storageError } = await supabase.storage
      .from("photos")
      .upload(imageName, finalCampaign.image);

    if (storageError) {
      console.error(storageError);
      throw new Error(storageError.message);
    }
  }

  const { data, error } = await query.select().single();
  if (error) {
    console.log("campaign could not be created/updated", error);
    throw new Error(error.message);
  }
  return data;
}
