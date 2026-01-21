
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { File } from "lucide-react"; // Changed from FileText, Download, Calendar
import { format } from "date-fns";

export default function DocumentoCard({ documento, onUpdate, theme = 'light' }) {
  const [deleting, setDeleting] = useState(false);
  const isDark = theme === 'dark';

  const handleDelete = async () => {
    setDeleting(true);
    // Placeholder for actual delete logic (e.g., API call)
    // In a real application, this would involve a network request
    // and error handling. For now, it just simulates an operation.
    console.log(`Attempting to delete document: ${documento.nome_documento}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
    console.log("Delete operation simulated.");
    setDeleting(false);
    // You might call onUpdate here to re-fetch or remove the item from the list
    // if onUpdate handles such scenarios.
  };

  // The previous getFileIcon and fileExtension logic is removed as per the new design.

  return (
    <Card className={`group relative hover:shadow-lg transition-shadow ${isDark ? 'bg-gray-800' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
            <File className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <a href={documento.arquivo} target="_blank" rel="noopener noreferrer" className="font-semibold block truncate text-blue-600 hover:underline" title={documento.nome_documento}>
              {documento.nome_documento}
            </a>
            {documento.numero_documento && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>#{documento.numero_documento}</p>
            )}
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{format(new Date(documento.created_date), "dd/MM/yyyy")}</p>
          </div>
        </div>
      </CardContent>
      {/* 
        The outline mentioned "// ... keep existing code (delete dialog) ...".
        As there was no existing delete dialog in the original code and no
        implementation details were provided for it in the outline,
        it has been omitted to avoid creating incomplete or non-functional code.
        If a delete dialog is needed, its implementation would go here,
        potentially using the 'deleting' state.
      */}
    </Card>
  );
}
