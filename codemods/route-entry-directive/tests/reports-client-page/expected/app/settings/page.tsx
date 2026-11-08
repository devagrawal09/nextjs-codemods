"use client";

// reported: the whole route renders on the client, cannot export metadata,
// and fetches its data after hydration
export default function SettingsPage() {
  return <h1>Settings</h1>;
}
