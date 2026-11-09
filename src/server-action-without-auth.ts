__PRELUDE__
__RESOLVE__

// Calls that read the caller's identity or check access. Anything matching counts as a check.
const AUTH_CALL = /auth|session|user|permission|access|verify|guard|protect|role|owner|member|token|signature|apikey|admin|require|assert|ensure|signed|login/i;
// next-safe-action style clients whose name says they run auth middleware.
const AUTHED_CLIENT = /auth|protected|user|org|team|workspace|admin|member|account/i;

const AUTH_MIDDLEWARE = new RegExp(`\\.use\\(\\s*[\\w$]*(${AUTH_CALL.source})|\\.use\\([\\s\\S]*?\\b[\\w$.]*(${AUTH_CALL.source})[\\w$]*\\s*\\(`, "i");

// A client whose `.use(...)` middleware calls auth, in its own definition or in the client it extends.
const clientRunsAuth = (source: string, name: string, depth = 0): boolean => {
  const definition = definitionIn(source, name);
  if (!definition) return false;
  if (AUTH_MIDDLEWARE.test(definition)) return true;
  const base = definition.match(/=\s*([A-Za-z_$][\w$]*)\s*\./)?.[1];
  return depth < 3 && !!base && base !== name && clientRunsAuth(source, base, depth + 1);
};

// Follows the client to the file that defines it, so middleware in another file counts.
const clientIsAuthed = (program: SgNode<TSX>, file: string, client: string) => {
  const imported = importOf(program, client);
  if (!imported) return clientRunsAuth(program.text(), client);
  const module = resolveImport(file, imported.spec);
  return !!module && clientRunsAuth(module.source, imported.name);
};

const isUseServerFile = (program: SgNode<TSX>) => {
  const first = program.children().find((c) => c.isNamed() && c.kind() !== "comment");
  return first?.kind() === "expression_statement" && /^["']use server["']$/.test(first.children().find((c) => c.isNamed())?.text() ?? "");
};

const checksAuth = (fn: SgNode<TSX>) =>
  fn.has({
    rule: {
      kind: "call_expression",
      has: { field: "function", regex: `(?i)${AUTH_CALL.source}` },
    },
  }) || fn.has({ rule: { kind: "identifier", regex: "^(session|user|userId|currentUser)$", inside: { kind: "variable_declarator", field: "name" } } });

// Actions that only bust the Next.js cache are low impact; everything else can read or write data.
const effectOf = (fn: SgNode<TSX>) => {
  const callees = fn.findAll({ rule: { kind: "call_expression" } }).map((c) => c.field("function")?.text() ?? "");
  return callees.length > 0 && callees.every((c) => /^(revalidatePath|revalidateTag|unstable_cache)$/.test(c)) ? "cache-revalidation" : "reads-or-writes";
};

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  const program = root.root();
  if (!isUseServerFile(program)) return null;
  // --param authedClients=actionClient,adminClient marks clients known to run auth middleware.
  const authedClients = new Set(String(options.params?.authedClients ?? "").split(",").map((c) => c.trim()).filter(Boolean));

  for (const exported of program.findAll({ rule: { kind: "export_statement" } })) {
    const declaration = exported.field("declaration");
    if (!declaration) continue;

    if (declaration.kind() === "function_declaration") {
      if (/^async\b/.test(declaration.text()) && !checksAuth(declaration)) report(declaration, { kind: "async-function", effect: effectOf(declaration) });
      continue;
    }

    // Only the exported names themselves; helpers declared inside an action are not actions.
    for (const declarator of declaration.children().filter((c) => c.kind() === "variable_declarator")) {
      const value = declarator.field("value");
      if (!value) continue;
      if (value.kind() === "arrow_function" || value.kind() === "function_expression") {
        if (/^async\b/.test(value.text()) && !checksAuth(value)) report(declarator, { kind: "async-function", effect: effectOf(value) });
        continue;
      }
      // actionClient.schema(...).action(async () => ...): judge by the client the chain starts from.
      if (value.kind() === "call_expression" && /\.action$/.test(value.field("function")?.text() ?? "")) {
        const client = value.text().match(/^[A-Za-z_$][\w$]*/)?.[0] ?? "";
        if (AUTHED_CLIENT.test(client) || authedClients.has(client) || checksAuth(value)) continue;
        if (clientIsAuthed(program, root.filename(), client)) continue;
        // The client usually lives in another file, so name it: one look at its middleware
        // settles every action built on it.
        report(declarator, { kind: "action-client", effect: effectOf(value), client });
      }
    }
  }
  return null;
};

export default codemod;
