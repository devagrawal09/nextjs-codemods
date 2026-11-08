export function Card({ onOpen, rest }: { onOpen: () => void; rest: object }) {
  return (
    <section>
      {/* not reported: has a role and keyboard handler */}
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={onOpen}>Open</div>
      {/* not reported: only stops the click reaching the parent */}
      <div onClick={(e) => e.stopPropagation()}>menu</div>
      {/* not reported: a spread may carry the role */}
      <span {...rest} onClick={onOpen} />
      {/* not reported: buttons are interactive */}
      <button onClick={onOpen}>Open</button>
      {/* reported: the one control case in this fixture */}
      <li onClick={onOpen}>Open</li>
    </section>
  );
}
