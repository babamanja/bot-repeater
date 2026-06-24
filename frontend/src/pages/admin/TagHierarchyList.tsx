import type { AdminTag } from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Card from "../../components/UI/Card";
import type { TagTreeNode } from "./tagTree";

type TagHierarchyListProps = {
  nodes: TagTreeNode[];
  deletingTagId: number | null;
  onAddChild: (tag: AdminTag) => void;
  onEdit: (tag: AdminTag) => void;
  onDelete: (tag: AdminTag) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

function TagHierarchyNode({
  node,
  deletingTagId,
  onAddChild,
  onEdit,
  onDelete,
  t,
}: {
  node: TagTreeNode;
  deletingTagId: number | null;
  onAddChild: (tag: AdminTag) => void;
  onEdit: (tag: AdminTag) => void;
  onDelete: (tag: AdminTag) => void;
  t: TagHierarchyListProps["t"];
}) {
  return (
    <li className="admin-tags-tree__item">
      <div className="admin-tags-tree__row">
        <div className="admin-tags-tree__info">
          <span className="admin-tags-tree__name">{node.name}</span>
          <span className="admin-tags-tree__meta">
            {t("admin.tagsChildCount")}: {node.childCount}
            <span className="admin-tags-tree__meta-sep" aria-hidden>
              ·
            </span>
            {t("admin.tagsPairCount")}: {node.vocabPairCount}
          </span>
        </div>
        <div className="admin-tags-tree__actions">
          <Button type="button" style="secondary" onClick={() => onAddChild(node)}>
            {t("admin.tagsAddChild")}
          </Button>
          <Button type="button" style="secondary" onClick={() => onEdit(node)}>
            {t("admin.tagsEdit")}
          </Button>
          <Button
            type="button"
            style="secondary"
            disabled={deletingTagId === node.id}
            onClick={() => void onDelete(node)}
          >
            {deletingTagId === node.id ? t("admin.tagsDeleting") : t("admin.tagsDelete")}
          </Button>
        </div>
      </div>
      {node.children.length > 0 ? (
        <ul className="admin-tags-tree__children">
          {node.children.map((child) => (
            <TagHierarchyNode
              key={child.id}
              node={child}
              deletingTagId={deletingTagId}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              t={t}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TagHierarchyList({
  nodes,
  deletingTagId,
  onAddChild,
  onEdit,
  onDelete,
  t,
}: TagHierarchyListProps) {
  return (
    <Card className="admin-tags-tree" padding="compact">
      <ul className="admin-tags-tree__roots">
        {nodes.map((node) => (
          <TagHierarchyNode
            key={node.id}
            node={node}
            deletingTagId={deletingTagId}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            t={t}
          />
        ))}
      </ul>
    </Card>
  );
}
