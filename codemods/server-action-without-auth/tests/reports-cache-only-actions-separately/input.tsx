"use server";

import { revalidatePath } from "next/cache";

// reported as cache-revalidation: anyone can bust this cache, but no data is exposed
export async function revalidateEventTypePage(id: number) {
  revalidatePath(`/event-types/${id}`);
}
