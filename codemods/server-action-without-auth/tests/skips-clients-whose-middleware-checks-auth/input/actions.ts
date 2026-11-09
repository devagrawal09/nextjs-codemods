"use server";

import { actionClient, publicClient } from "./safe-action";
import { db } from "./db";

// not reported: actionClient's middleware calls auth() in safe-action.ts
export const renameTeam = actionClient.action(async ({ parsedInput, ctx }) => {
  await db.team.update({ where: { id: parsedInput.id, ownerId: ctx.userId }, data: { name: parsedInput.name } });
});

// reported: the one control case in this fixture
export const deleteTeam = publicClient.action(async ({ parsedInput }) => {
  await db.team.delete({ where: { id: parsedInput.id } });
});
