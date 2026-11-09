import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";

const findings = useMetricAtom("unsanitized-inner-html");

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

// Sanitizers, "safe" HTML helpers, and the `.replace(/</g, "\\u003c")` JSON-in-script escape.
const SANITIZER = /sanitiz|purif|xss|escape|safe|\\u003c|\\x3c|&lt;/i;
// What a hand-written escaper does: replace `<` with an entity or a unicode escape.
const ESCAPES_HTML = /\\u003c|\\x3c|&lt;|&#0?60;|\[[^\]\n]*<[^\]\n]*\]/;

// `serializeJsonLd(data)`: the helper escapes `<` in its body or in the constants it uses, here or in its module.
const withConstants = (source: string, definition: string | null) =>
  [definition ?? "", ...(definition?.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) ?? []).map((c) => definitionIn(source, c) ?? "")].join("\n");

const helperEscapes = (program: SgNode<TSX>, file: string, call: SgNode<TSX>) => {
  const callee = call.field("function");
  if (callee?.kind() !== "identifier") return false;
  const local = definitionIn(program.text(), callee.text());
  if (local) return ESCAPES_HTML.test(withConstants(program.text(), local));
  const imported = importOf(program, callee.text());
  const module = imported && resolveImport(file, imported.spec);
  return !!module && ESCAPES_HTML.test(withConstants(module.source, definitionIn(module.source, imported.name)));
};

// Shiki escapes the code it highlights: `__html: html` where html, or its setter, is filled from codeToHtml.
const fromShiki = (program: SgNode<TSX>, html: SgNode<TSX>) => {
  const name = html.text().match(/^[\w$]+/)?.[0];
  if (!name) return false;
  const filled = new RegExp(`\\b(${name}|set${name.charAt(0).toUpperCase()}${name.slice(1)})\\b`);
  return program
    .findAll({ rule: { kind: "call_expression", has: { field: "function", regex: "codeTo(Html|Hast)$" } } })
    .some((call) => filled.test(call.ancestors().find((a) => /(statement|declaration)$/.test(a.kind()))?.text() ?? ""));
};

const MARKDOWN = /marked|markdown|remark|rehype|md|mdx|highlight|shiki|codeToHtml|toHtml|render/i;

const classify = (value: SgNode<TSX>) => {
  if (value.kind() === "call_expression") {
    const callee = value.field("function")?.text() ?? "";
    if (callee === "JSON.stringify") return "json-stringify";
    return MARKDOWN.test(callee) ? "rendered-markup" : "function-result";
  }
  if (value.kind() === "template_string") return "template";
  return value.kind() === "identifier" || value.kind() === "member_expression" ? "variable" : "expression";
};

const codemod: Codemod<TSX> = async (root, options) => {
  // --param includeExamples=1 keeps example and demo code, which is sometimes copied into apps.
  if (!options.params?.includeExamples && (EXAMPLE_PATH.test(root.filename().replace(/\\/g, "/")) || OG_IMAGE.test(root.root().text()))) return null;
  const report = (node: SgNode<TSX>, dims: Record<string, string>) => {
    findings.increment(dims);
    if (options.params?.locations) {
      console.log(`FINDING\tunsanitized-inner-html\t${root.filename()}:${node.range().start.line + 1}\t${JSON.stringify(dims)}`);
    }
  };

  const program = root.root();
  const attributes = program.findAll({
    rule: { kind: "jsx_attribute", has: { kind: "property_identifier", regex: "^dangerouslySetInnerHTML$" } },
  });

  for (const attribute of attributes) {
    // <style> injection is limited to CSS; script and markup sinks are the XSS risk.
    if (attribute.parent()?.field("name")?.text() === "style") continue;
    const html = attribute.find({
      rule: { kind: "pair", has: { field: "key", regex: "^__html$" } },
    })?.field("value");
    if (!html) continue;
    if (html.kind() === "string") continue;
    if (html.kind() === "template_string" && !html.has({ rule: { kind: "template_substitution" } })) continue;
    if (SANITIZER.test(html.text())) continue;
    if (fromShiki(program, html)) continue;
    if (html.kind() === "call_expression" && helperEscapes(program, root.filename(), html)) continue;
    // `const clean = DOMPurify.sanitize(raw)` earlier in the file counts as sanitized.
    if (html.kind() === "identifier") {
      const declaration = root.root().find({
        rule: { kind: "variable_declarator", has: { field: "name", regex: `^${html.text()}$` } },
      });
      if (declaration && SANITIZER.test(declaration.field("value")?.text() ?? "")) continue;
    }
    report(attribute, { source: classify(html) });
  }
  return null;
};

export default codemod;
