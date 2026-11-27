import { useNavigate } from "@tanstack/react-router";
import { useAgri } from "./app-context";
import { toast } from "sonner";
export function useStartChat() {
  const { newThread } = useAgri();
  const navigate = useNavigate();
  return async (mode: "text" | "photo" | "voice" = "text", question = "") => {
    try {
      const id = await newThread();
      await navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: { mode, question },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start a conversation. Please try again.",
      );
    }
  };
}
