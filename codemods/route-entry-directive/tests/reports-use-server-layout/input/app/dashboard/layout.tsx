"use server";

// reported: "use server" does not mean "server component"; it exposes this layout,
// props and all, as a server action any client can POST to
export default async function DashboardLayout({ children, unprotected = false }: { children: React.ReactNode; unprotected?: boolean }) {
  return <main data-unprotected={unprotected}>{children}</main>;
}
