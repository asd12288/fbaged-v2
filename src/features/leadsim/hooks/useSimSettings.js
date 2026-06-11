import { useQuery } from "@tanstack/react-query";
import { getSimSettings } from "../../../services/leadSimApi";

export function useSimSettings() {
  const { data, isPending, error } = useQuery({
    queryKey: ["sim-settings"],
    queryFn: getSimSettings,
  });

  return {
    settings: data ?? null,
    // undefined while loading — do not coerce to false (false means LIVE).
    dryRun: data?.dry_run,
    isPending,
    error,
  };
}
