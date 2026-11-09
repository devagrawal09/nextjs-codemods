__PRELUDE__

const FUNCTION_KINDS = new Set(["arrow_function", "function_expression", "function", "function_declaration", "method_definition"]);
const LITERAL_KINDS = new Set(["true", "false", "null", "undefined", "number", "string", "array", "object"]);
// Reading the DOM or browser storage is syncing with an external system, which is what effects are for.
const BROWSER_GLOBAL = "^(document|window|localStorage|sessionStorage|navigator|location)$";

// Setters from `const [x, setX] = useState(...)` in the component itself; context or parent setters push state out.
const localSetters = (component: SgNode<TSX> | undefined) =>
  new Set(
    component
      ?.findAll({ rule: { kind: "variable_declarator", has: { field: "value", regex: "^(React\\.)?useState\\b" } } })
      .map((d) => d.field("name")?.children().filter((c) => c.isNamed())[1]?.text() ?? "") ?? [],
  );

const isSetterCall = (statement: SgNode<TSX>, setters: Set<string>) => {
  if (statement.kind() !== "expression_statement") return false;
  const call = statement.children().find((c) => c.isNamed());
  if (call?.kind() !== "call_expression") return false;
  if (!setters.has(call.field("function")?.text() ?? "")) return false;
  return !call.has({
    rule: { any: [{ kind: "await_expression" }, { kind: "arrow_function" }, { kind: "function_expression" }, { kind: "identifier", regex: BROWSER_GLOBAL }] },
  });
};

// `{ title: "" }` is a reset; `{ title: document.title }` carries a value.
const isLiteral = (arg: SgNode<TSX>) =>
  LITERAL_KINDS.has(arg.kind()) && !arg.has({ rule: { any: [{ kind: "identifier" }, { kind: "shorthand_property_identifier" }] } });

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  const effects = root.root().findAll({
    rule: { kind: "call_expression", has: { field: "function", regex: "^(React\\.)?useEffect$" } },
  });

  for (const effect of effects) {
    const [callback, deps] = effect.field("arguments")?.children().filter((c) => c.isNamed()) ?? [];
    // An effect with no deps array or `[]` runs on mount, not when an input changes.
    if (!callback || deps?.kind() !== "array" || !deps.children().some((c) => c.isNamed())) continue;
    const body = callback.field("body");
    if (body?.kind() !== "statement_block") continue;

    const setters = localSetters(effect.ancestors().find((a) => FUNCTION_KINDS.has(a.kind())));
    const statements = body.children().filter((c) => c.isNamed() && c.kind() !== "comment");
    if (statements.length === 0 || statements.length > 3 || !statements.every((s) => isSetterCall(s, setters))) continue;

    const setterArgs = statements.flatMap(
      (s) => s.find({ rule: { kind: "arguments" } })?.children().filter((c) => c.isNamed()) ?? [],
    );
    const kind = setterArgs.every(isLiteral) ? "reset-on-change" : "derived-value";
    report(effect, { kind });
  }
  return null;
};

export default codemod;
