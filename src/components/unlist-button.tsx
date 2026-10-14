import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setListing } from "@/lib/campus.functions";

interface UnlistButtonProps {
  itemType: "lost" | "found" | "resource";
  itemId: string;
  listed?: boolean;
}

/** Owner-only toggle that hides a post from the board (or puts it back). */
export function UnlistButton({ itemType, itemId, listed = true }: UnlistButtonProps) {
  const toggle = useServerFn(setListing);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => toggle({ data: { itemType, itemId, listed: !listed } }),
    onSuccess: () => {
      toast.success(listed ? "Post unlisted. It's hidden from the board." : "Post is back on the board.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (listed && !window.confirm("Unlist this post? Pending claims or requests on it will be cancelled.")) return;
        mutation.mutate();
      }}
      disabled={mutation.isPending}
    >
      {listed ? <EyeOff className="mr-1 size-3.5" /> : <Eye className="mr-1 size-3.5" />}
      {listed ? "Unlist" : "Relist"}
    </Button>
  );
}
