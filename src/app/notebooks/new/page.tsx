import { Suspense } from "react";
import { NewNotebookForm } from "./form";

export default function NewNotebookPage() {
  return (
    <Suspense fallback={null}>
      <NewNotebookForm />
    </Suspense>
  );
}
