'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ArrowDown, ArrowUp, Download, FileText, Trash2, Upload } from 'lucide-react';

interface PdfItem {
  id: string;
  file: File;
}

export default function Home() {
  const [files, setFiles] = useState<PdfItem[]>([]);
  const [fileName, setFileName] = useState('samlet-dokument');
  const [isMerging, setIsMerging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: PdfItem[] = Array.from(e.target.files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setFiles(updated);
  };

  const removeItem = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMergeAndDownload = async () => {
    if (files.length === 0) return;
    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const buffer = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim()}.pdf`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Der opstod en fejl under fletningen af filerne.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Saml PDF-filer</h1>
        <p className="text-sm text-slate-500 mb-6">
          Vælg flere PDF-filer, justér rækkefølgen, giv den samlede fil et navn og download den.
        </p>

        <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors mb-6">
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-700">Vælg PDF-filer</span>
          <span className="text-xs text-slate-400 mt-1">Du kan vælge flere ad gangen</span>
          <input
            type="file"
            multiple
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {files.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-700">Valgte dokumenter ({files.length})</h2>
            <div className="space-y-2">
              {files.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 overflow-hidden mr-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-sm truncate text-slate-800">{item.file.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                      title="Flyt op"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                      title="Flyt ned"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-red-500 hover:text-red-700 ml-2"
                      title="Fjern"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filnavn på samlet PDF
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="samlet-dokument"
              />
            </div>

            <button
              onClick={handleMergeAndDownload}
              disabled={isMerging}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isMerging ? 'Samler filer...' : 'Saml og download'}</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
