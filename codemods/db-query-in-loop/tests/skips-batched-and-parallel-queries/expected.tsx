import { db } from "./db";
import { prisma } from "./prisma";

export async function addMembers(teamId: string, userIds: string[]) {
  // not reported: one batched query
  await prisma.membership.createMany({ data: userIds.map((userId) => ({ teamId, userId })) });
  // not reported: the loop builds promises that run together
  await Promise.all(userIds.map(async (userId) => prisma.user.update({ where: { id: userId }, data: { teamId } })));
  // not reported: paging through a table in batches is deliberate
  let cursor: string | undefined;
  while (true) {
    const page = await prisma.user.findMany({ take: 100, cursor: cursor ? { id: cursor } : undefined });
    if (page.length === 0) break;
    cursor = page.at(-1)?.id;
  }
  for (const userId of userIds) {
    // reported: the one control case in this fixture
    await db.select().from(users).where(eq(users.id, userId));
  }
}
