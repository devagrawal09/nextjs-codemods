__PRELUDE__

const LIMIT = 300;
const JSX: Rule<TSX> = { any: [{ kind: "jsx_element" }, { kind: "jsx_self_closing_element" }] };

const bucket = (lines: number) => (lines >= 1000 ? "1000+" : lines >= 500 ? "500-999" : "300-499");
// Long-but-static components (icon maps, marketing copy) hold little state; this separates them.
const stateBucket = (count: number) => (count === 0 ? "0" : count <= 5 ? "1-5" : count <= 10 ? "6-10" : "11+");

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  // function Foo() {}, const Foo = () => {}, const Foo = forwardRef(() => {}) / memo(...) / observer(...)
  const components = root.root().findAll({
    rule: {
      any: [
        { kind: "function_declaration", has: { field: "name", regex: "^[A-Z]" } },
        {
          kind: "variable_declarator",
          has: { field: "name", kind: "identifier", regex: "^[A-Z]" },
          any: [
            { has: { field: "value", any: [{ kind: "arrow_function" }, { kind: "function_expression" }] } },
            { has: { field: "value", kind: "call_expression", has: { field: "arguments", has: { any: [{ kind: "arrow_function" }, { kind: "function_expression" }] } } } },
          ],
        },
      ],
    },
  });

  for (const component of components) {
    const { start, end } = component.range();
    const lines = end.line - start.line + 1;
    if (lines < LIMIT || !component.has({ rule: JSX })) continue;
    const stateHooks = component.findAll({ rule: { pattern: "$HOOK($$$ARGS)", has: { field: "function", regex: "^(React\\.)?use(State|Reducer)$" } } }).length;
    report(component, { size: bucket(lines), stateHooks: stateBucket(stateHooks) });
  }
  return null;
};

export default codemod;
