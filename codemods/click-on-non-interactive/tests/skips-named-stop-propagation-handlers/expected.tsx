const stopPropagation = (e: { stopPropagation: () => void }) => e.stopPropagation();

export function Row({ onOpen }: { onOpen: () => void }) {
  return (
    <li>
      {/* not reported: only stops the click reaching the row */}
      <div onClick={stopPropagation}>actions</div>
      {/* reported: the one control case in this fixture */}
      <span onClick={onOpen}>Open</span>
    </li>
  );
}
