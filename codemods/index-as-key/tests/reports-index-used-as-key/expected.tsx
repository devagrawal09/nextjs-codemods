export function Todos({ todos }: { todos: { id: string; title: string }[] }) {
  // reported: deleting the first todo shifts every key, so inputs keep the wrong state
  return <ul>{todos.map((todo, index) => <li key={index}><input defaultValue={todo.title} /></li>)}</ul>;
}
