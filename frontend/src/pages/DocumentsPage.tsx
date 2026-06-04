import { DocumentLibrary } from "@/components/documents/DocumentLibrary";
import { DocumentDetail } from "@/components/documents/DocumentDetail";
import { useState } from "react";

export function DocumentsPage() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  if (selectedDocId) {
    return (
      <DocumentDetail
        documentId={selectedDocId}
        onBack={() => setSelectedDocId(null)}
      />
    );
  }

  return <DocumentLibrary onViewDocument={(id) => setSelectedDocId(id)} />;
}
