export function Todos({ todos }: { todos: { id: string; title: string }[] }) {
  return (
    <ul>
      {/* not reported: stable id */}
      {todos.map((todo) => <li key={todo.id}>{todo.title}</li>)}
      {/* not reported: id plus index still carries identity */}
      {todos.map((todo, i) => <li key={`${todo.id}-${i}`}>{todo.title}</li>)}
      {/* reported: the one control case in this fixture */}
      {todos.map((todo, idx) => <li key={idx}>{todo.title}</li>)}
    </ul>
  );
}
