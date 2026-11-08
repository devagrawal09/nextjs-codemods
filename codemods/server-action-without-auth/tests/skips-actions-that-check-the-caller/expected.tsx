"use server";

import { auth } from "./auth";
import { authActionClient } from "./safe-action";
import { db } from "./db";

// not reported: reads the session first
export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await db.project.delete({ where: { id: projectId, ownerId: session.user.id } });
}

// not reported: the client name says it runs auth middleware
export const renameTeam = authActionClient.action(async ({ parsedInput }) => {
  await db.team.update({ where: { id: parsedInput.id }, data: { name: parsedInput.name } });
});

// reported: the one control case in this fixture
export const archiveProject = async (projectId: string) => {
  await db.project.update({ where: { id: projectId }, data: { archived: true } });
};
