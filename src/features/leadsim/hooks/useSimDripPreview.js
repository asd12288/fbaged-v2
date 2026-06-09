import { useMutation } from "@tanstack/react-query";
import { previewSimDrip } from "../../../services/leadSimApi";

export function useSimDripPreview() {
  const { mutateAsync: previewDrip, isPending: isPreviewing, error } =
    useMutation({
      mutationFn: previewSimDrip,
    });

  return { previewDrip, isPreviewing, error };
}
