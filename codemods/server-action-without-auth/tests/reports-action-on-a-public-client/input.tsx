"use server";

import { actionClient } from "./safe-action";
import { db } from "./db";

// reported: built on a client whose name does not say it authenticates
export const renameTeam = actionClient.action(async ({ parsedInput }) => {
  await db.team.update({ where: { id: parsedInput.id }, data: { name: parsedInput.name } });
});
