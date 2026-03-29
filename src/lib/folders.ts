import type { Folder, Notebook } from "@/components/home/types";

type FolderLike = Pick<Folder, "id" | "name" | "parentId">;
type NotebookLike = Pick<Notebook, "id" | "title" | "folderId" | "updatedAt" | "cellCount"> & {
  tags: string | null;
};

export interface FolderTreeNode extends FolderLike {
  children: FolderTreeNode[];
  notebooks: NotebookLike[];
}

export interface FolderOption {
  id: string;
  label: string;
}

export function buildFolderTree(
  folders: FolderLike[],
  notebooks: NotebookLike[],
): { roots: FolderTreeNode[]; rootNotebooks: NotebookLike[] } {
  const byId = new Map<string, FolderTreeNode>();

  for (const folder of folders) {
    byId.set(folder.id, {
      ...folder,
      children: [],
      notebooks: [],
    });
  }

  for (const notebook of notebooks) {
    if (notebook.folderId && byId.has(notebook.folderId)) {
      byId.get(notebook.folderId)?.notebooks.push(notebook);
    }
  }

  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    const node = byId.get(folder.id);
    if (!node) continue;

    if (folder.parentId && byId.has(folder.parentId)) {
      byId.get(folder.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortFolderTree(roots);

  return {
    roots,
    rootNotebooks: notebooks
      .filter((notebook) => !notebook.folderId)
      .sort((left, right) => left.title.localeCompare(right.title)),
  };
}

export function flattenFolderOptions(folders: FolderLike[]): FolderOption[] {
  const { roots } = buildFolderTree(folders, []);
  const result: FolderOption[] = [];

  const visit = (nodes: FolderTreeNode[], trail: string[] = []) => {
    for (const node of nodes) {
      const path = [...trail, node.name];
      result.push({
        id: node.id,
        label: path.join(" / "),
      });
      visit(node.children, path);
    }
  };

  visit(roots);
  return result;
}

export function getFolderPath(folders: FolderLike[], folderId: string | null | undefined) {
  if (!folderId) return [] as FolderLike[];

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderLike[] = [];

  let currentId: string | null | undefined = folderId;
  const visited = new Set<string>();

  while (currentId && byId.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = byId.get(currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

function sortFolderTree(nodes: FolderTreeNode[]) {
  nodes.sort((left, right) => left.name.localeCompare(right.name));

  for (const node of nodes) {
    node.children.sort((left, right) => left.name.localeCompare(right.name));
    node.notebooks.sort((left, right) => left.title.localeCompare(right.title));
    sortFolderTree(node.children);
  }
}