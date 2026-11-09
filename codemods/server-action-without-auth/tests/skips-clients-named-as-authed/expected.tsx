"use server";

import { actionClient, publicClient } from "@/lib/safe-action";

// not reported: actionClient is passed as authed for this codebase
export const archiveThread = actionClient.action(async ({ parsedInput }) => db.thread.update(parsedInput));

// reported: the one control case in this fixture
export const subscribe = publicClient.action(async ({ parsedInput }) => db.subscriber.create(parsedInput));
