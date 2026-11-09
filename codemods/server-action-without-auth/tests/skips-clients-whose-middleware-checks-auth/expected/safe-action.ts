import { createSafeActionClient } from "next-safe-action";
import { auth } from "./auth";

const baseClient = createSafeActionClient();

export const actionClient = baseClient.use(async ({ next }) => {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return next({ ctx: { userId: session.user.id } });
});

export const publicClient = baseClient;
