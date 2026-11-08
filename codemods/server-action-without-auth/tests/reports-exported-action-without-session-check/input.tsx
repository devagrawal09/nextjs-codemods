"use server";

import { db } from "./db";

// reported: any client can call this with any id
export async function deleteProject(projectId: string) {
  await db.project.delete({ where: { id: projectId } });
}
