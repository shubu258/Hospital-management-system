"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Image as ImageIcon, Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import type { PatientDocument } from "@/lib/types";

function fileKindLabel(fileType: string): string {
  if (fileType === "application/pdf") return "PDF";
  if (fileType === "image/jpeg") return "JPG";
  if (fileType === "image/png") return "PNG";
  return fileType;
}

export function DocumentsSection({
  patientId,
  documents,
  namesById,
}: {
  patientId: string;
  documents: PatientDocument[];
  namesById: Record<string, string>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/backend/patients/${patientId}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error.message);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    await fetch(`/api/backend/patients/${patientId}/documents/${documentId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="font-semibold text-slate-900">Medical Documents</h3>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 uppercase">
            <th className="px-6 py-3 font-medium">File</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Uploaded</th>
            <th className="px-3 py-3 font-medium">Uploaded By</th>
            <th className="px-6 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-t border-slate-100">
              <td className="px-6 py-3">
                <div className="flex items-center gap-2 text-slate-700">
                  {doc.file_type === "application/pdf" ? (
                    <FileText className="h-4 w-4 shrink-0 text-danger" />
                  ) : (
                    <ImageIcon className="h-4 w-4 shrink-0 text-info" />
                  )}
                  <span className="truncate">{doc.file_name}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-slate-500">{fileKindLabel(doc.file_type)}</td>
              <td className="px-3 py-3 text-slate-500">{formatDate(doc.created_at)}</td>
              <td className="px-3 py-3 text-slate-500">
                {doc.uploaded_by ? (namesById[doc.uploaded_by] ?? "Unknown") : "Unknown"}
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={doc.url}
                        download={doc.file_name}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                No documents uploaded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
