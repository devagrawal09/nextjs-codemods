import { prisma } from "./prisma";

export async function addMembers(teamId: string, userIds: string[]) {
  for (const userId of userIds) {
    // reported: one round trip per user; createMany does it in one
    await prisma.membership.create({ data: { teamId, userId } });
  }
}
