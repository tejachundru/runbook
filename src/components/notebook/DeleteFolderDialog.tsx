"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Folder as FolderIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  folderName: string;
  notebookCount?: number;
  childFolderCount?: number;
  isDeleting?: boolean;
}

export default function DeleteFolderDialog({
  open,
  onOpenChange,
  onConfirm,
  folderName,
  notebookCount = 0,
  childFolderCount = 0,
  isDeleting = false,
}: Props) {
  const hasContent = notebookCount > 0 || childFolderCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <FolderIcon className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">Delete "{folderName}"?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {hasContent ? (
              <>
                This will permanently delete:
                {notebookCount > 0 && (
                  <>
                    {notebookCount} note{notebookCount > 1 ? "s" : ""}
                  </>
                )}
                {notebookCount > 0 && childFolderCount > 0 && " and "}
                {childFolderCount > 0 && (
                  <>
                    {childFolderCount} nested folder{childFolderCount > 1 ? "s" : ""}
                  </>
                )}
                {childFolderCount > 0 && " (including their contents)"}
              </>
            ) : (
              <>Delete the folder "{folderName}"</>
            )}
            <br />
            <br />
            <span className="text-destructive/80 font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete folder"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
