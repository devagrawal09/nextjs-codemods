"use server";

import { readSignedInAccount } from "./account";
import { api } from "./api";

// not reported: the account comes from the signed-in session
export async function removeContact(contactId: string) {
  const account = await readSignedInAccount();
  if (!account) return { ok: false };
  return api.removeContact(account, contactId);
}

// reported: the one control case in this fixture
export async function addContact(contactId: string) {
  return api.addContact(contactId);
}
