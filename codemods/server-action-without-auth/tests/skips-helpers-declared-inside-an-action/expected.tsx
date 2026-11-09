"use server";

import { auth } from "./auth";
import { db } from "./db";

// not reported: the action checks the session; the inner helper is not an action
export const resetRules = async (accountId: string) => {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const remove = async (id: string) => db.rule.delete({ where: { id } });
  await remove(accountId);
};

// reported: the one control case in this fixture
export const archiveRules = async (accountId: string) => {
  await db.rule.updateMany({ where: { accountId }, data: { archived: true } });
};
