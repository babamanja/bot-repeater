import type { TagTreeNode } from "./tagTree";

type TagTreePickerProps = {
  nodes: TagTreeNode[];
  selectedTagIds: number[];
  disabled: boolean;
  onToggle: (tagId: number) => void;
};

export default function TagTreePicker({
  nodes,
  selectedTagIds,
  disabled,
  onToggle,
}: TagTreePickerProps) {
  return (
    <ul className="add-word-modal__tag-children">
      {nodes.map((node) => (
        <li key={node.id} className="add-word-modal__tag-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="checkbox-hidden"
              checked={selectedTagIds.includes(node.id)}
              disabled={disabled}
              onChange={() => onToggle(node.id)}
            />
            <span className="checkbox-visible" aria-hidden>
              <span
                className={
                  selectedTagIds.includes(node.id)
                    ? "checkbox-visible__checkmark checkbox-visible__checkmark--checked"
                    : "checkbox-visible__checkmark"
                }
              >
                ✓
              </span>
            </span>
            <span>{node.name}</span>
          </label>
          {node.children.length > 0 ? (
            <TagTreePicker
              nodes={node.children}
              selectedTagIds={selectedTagIds}
              disabled={disabled}
              onToggle={onToggle}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
