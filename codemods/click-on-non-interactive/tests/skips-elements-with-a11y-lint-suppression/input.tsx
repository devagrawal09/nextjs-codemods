export function Section({ onToggle }: { onToggle: () => void }) {
  return (
    <section>
      {/* not reported: the suppression says the inner button handles the keyboard */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={onToggle}>
        <button onClick={onToggle}>Toggle</button>
      </div>
      {/* reported: the one control case in this fixture */}
      <div onClick={onToggle}>Toggle</div>
    </section>
  );
}
