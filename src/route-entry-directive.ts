__PRELUDE__

// App Router entry files: app/**/page.tsx, layout.tsx, template.tsx (also .jsx/.ts/.js).
const ROUTE_ENTRY = /(^|\/)app\/(.+\/)?(page|layout|template)\.[jt]sx?$/;

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  const entry = root.filename().replace(/\\/g, "/").match(ROUTE_ENTRY)?.[3];
  if (!entry) return null;
  const program = root.root();
  const first = program.children().find((c) => c.isNamed() && c.kind() !== "comment");
  const directive = first?.kind() === "expression_statement" ? first.children().find((c) => c.isNamed())?.text() : "";
  // "use client" pushes the route to the browser; "use server" turns every export,
  // including the page or layout component itself, into a callable server action.
  const name = directive?.replace(/^["']|["']$/g, "");
  if (name === "use client" || name === "use server") report(first!, { entry, directive: name.replace(" ", "-") });
  return null;
};

export default codemod;
