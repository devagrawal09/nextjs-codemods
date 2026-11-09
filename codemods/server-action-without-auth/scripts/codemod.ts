import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";

const findings = useMetricAtom("server-action-without-auth");

// Demo apps, examples and OG images rendered by Satori aren't shipped UI.
const EXAMPLE_PATH = /(^|\/)(examples?|demos?|playgrounds?|sandbox(es)?)\/|[-_.](demo|example|dummy)s?[-_./]/i;
const OG_IMAGE = /from\s+["'](next\/og|@vercel\/og|satori)["']|new ImageResponse\(/;
import * as fs from "fs";

const sources = new Map<string, string | null>();
const readSource = (path: string) => {
  if (!sources.has(path)) {
    try {
      sources.set(path, fs.readFileSync(path, "utf8"));
    } catch {
      sources.set(path, null);
    }
  }
  return sources.get(path) ?? null;
};

const normalize = (path: string) =>
  path.split("/").reduce<string[]>((parts, part) => {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
    return parts;
  }, []).join("/");

// Relative imports, plus aliases such as "@/x" and "~/x" tried against every folder above the importer.
const resolveImport = (fromFile: string, spec: string): { path: string; source: string } | null => {
  const dir = fromFile.replace(/\\/g, "/").replace(/\/[^/]*$/, "");
  const alias = spec.match(/^[@~#]\/(.*)$/)?.[1];
  const bases = spec.startsWith(".") ? [normalize(`${dir}/${spec}`)] : [];
  if (alias) {
    for (let d = dir; d.includes("/"); d = d.replace(/\/[^/]*$/, "")) bases.push(`${d}/${alias}`, `${d}/src/${alias}`);
  }
  for (const base of bases) {
    for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]) {
      const source = /\.[jt]sx?$/.test(base + ext) ? readSource(base + ext) : null;
      if (source !== null) return { path: base + ext, source };
    }
  }
  return null;
};

// The module and exported name a local name was imported from, if any.
const importOf = (program: SgNode<TSX>, local: string) => {
  for (const statement of program.findAll({ rule: { kind: "import_statement" } })) {
    const match = statement.text().match(new RegExp(`\\b(?:([\\w$]+)\\s+as\\s+)?${local}\\b`));
    const spec = statement.field("source")?.text().slice(1, -1);
    if (match && spec) return { spec, name: match[1] ?? local };
  }
  return null;
};

// The text of `const name = ...` or `function name(...)` up to the next top-level declaration.
const definitionIn = (source: string, name: string) => {
  const start = source.search(new RegExp(`(\\b(const|let|var)\\s+${name}\\s*[=:]|\\bfunction\\s+${name}\\s*[(<])`));
  if (start < 0) return null;
  const end = source.slice(start + 1).search(/\n(export\s+)?(default\s+)?(const|let|var|async\s+function|function|class)\s/);
  return source.slice(start, end < 0 ? undefined : start + 1 + end);
};

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
  // --param includeExamples=1 keeps example and demo code, which is sometimes copied into apps.
  if (!options.params?.includeExamples && (EXAMPLE_PATH.test(root.filename().replace(/\\/g, "/")) || OG_IMAGE.test(root.root().text()))) return null;
  const report = (node: SgNode<TSX>, dims: Record<string, string>) => {
    findings.increment(dims);
    if (options.params?.locations) {
      console.log(`FINDING\tserver-action-without-auth\t${root.filename()}:${node.range().start.line + 1}\t${JSON.stringify(dims)}`);
    }
  };

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
