import { db } from "./db";
import { chunk } from "./chunk";

const CHUNK = 5000;

export async function copyTopics(rows: Topic[], ids: string[]) {
  // not reported: one insert per 5,000 rows keeps each statement under the parameter cap
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(topics).values(rows.slice(i, i + CHUNK));
  }
  // not reported: each pass inserts a whole batch
  for (const batch of chunk(rows, 100)) {
    await db.insert(topics).values(batch);
  }
  for (const id of ids) {
    // reported: the one control case in this fixture
    await db.delete(topics).where(eq(topics.id, id));
  }
}
