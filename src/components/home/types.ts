export interface NotebookLike {
  id: string;
  title: string;
  folderId: string | null;
  tags: string | null;
  updatedAt: string;
  cellCount: number;
}

export interface Notebook extends NotebookLike {
  createdAt: string;
}

export interface FolderLike {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Folder extends FolderLike {
  createdAt: string;
  updatedAt: string;
}

export interface PageData {
  notebooks: Notebook[];
  folders: Folder[];
}
