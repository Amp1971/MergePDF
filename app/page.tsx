'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Scissors,
  Trash2,
  Upload,
} from 'lucide-react';

interface PdfItem {
  id: string;
  file: File;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');

  // --- STATE TIL MERGE ---
  const [mergeFiles, setMergeFiles] = useState<PdfItem[]>([]);
  const [mergeFileName, setMergeFileName] = useState('samlet-dokument');
  const [isMerging, setIsMerging] = useState(false);

  // --- STATE TIL SPLIT ---
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [splitRanges, setSplitRanges] = useState<string>('');
  const [isSplitting, setIsSplitting] = useState(false);

  // -------------------------------------------------------------
  // MERGE FUNKTIONER
  // -------------------------------------------------------------
  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: PdfItem[] = Array.from(e.target.files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
    }));
    setMergeFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mergeFiles.length) return;
    const updated = [...mergeFiles];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setMergeFiles(updated);
  };

  const removeMergeItem = (id: string) => {
    setMergeFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMergeAndDownload = async () => {
    if (mergeFiles.length === 0) return;
    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of mergeFiles) {
        const buffer = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes.buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = mergeFileName.trim().endsWith('.pdf')
        ? mergeFileName.trim()
        : `${mergeFileName.trim()}.pdf`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Der opstod en fejl under fletningen af filerne.');
    } finally {
      setIsMerging(false);
    }
  };

  // -------------------------------------------------------------
  // SPLIT FUNKTIONER
  // -------------------------------------------------------------
  const handleSplitFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSplitFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();
      setTotalPages(count);
      // Sæt et standardforslag: første side vs resten hvis der er > 1 side
      if (count > 1) {
        setSplitRanges(`1, 2-${count}`);
      } else {
        setSplitRanges('1');
      }
    } catch (err) {
      console.error(err);
      alert('Kunne ikke indlæse PDF-filen.');
      setSplitFile(null);
      setTotalPages(null);
    }

    e.target.value = '';
  };

  const handleSplitAndDownload = async () => {
    if (!splitFile || !totalPages) return;
    setIsSplitting(true);

    try {
      const buffer = await splitFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer);

      // Split teksten op på kommaer (f.eks. "1-2, 3-5")
      const groups = splitRanges
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);

      if (groups.length === 0) {
        alert('Angiv venligst gyldige sideintervaller (f.eks. 1-2, 3-5).');
        setIsSplitting(false);
        return;
      }

      const baseName = splitFile.name.replace(/\.[^/.]+$/, '');

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        let pageIndices: number[] = [];

        if (group.includes('-')) {
          const parts = group.split('-').map((n) => parseInt(n.trim(), 10));
          const start = Math.max(1, parts[0]);
          const end = Math.min(totalPages, parts[1]);
          for (let p = start; p <= end; p++) {
            pageIndices.push(p - 1);
          }
        } else {
          const single = parseInt(group, 10);
          if (single >= 1 && single <= totalPages) {
            pageIndices.push(single - 1);
          }
        }

        if (pageIndices.length === 0) continue;

        // Opret del-PDF
        const subDoc = await PDFDocument.create();
        const pages = await subDoc.copyPages(srcDoc, pageIndices);
        pages.forEach((p) => subDoc.addPage(p));

        const bytes = await subDoc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], {
          type: 'application/pdf',
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${baseName}_del_${i + 1}.pdf`;
        link.click();

        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert('Der opstod en fejl under opdelingen af filen.');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
        {/* Navigation tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('merge')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'merge'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Saml PDF</span>
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center space-x-2 py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'split'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Split PDF</span>
          </button>
        </div>

        {/* ---------------- MERGE VIEW ---------------- */}
        {activeTab === 'merge' && (
          <div>
            <h1 className="text-xl font-bold mb-1">Saml PDF-filer</h1>
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
                onChange={handleMergeFileChange}
              />
            </label>

            {mergeFiles.length > 0 && (
              <div className="space-y-4 mb-6">
                <h2 className="text-sm font-semibold text-slate-700">
                  Valgte dokumenter ({mergeFiles.length})
                </h2>
                <div className="space-y-2">
                  {mergeFiles.map((item, index) => (
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
                          disabled={index === mergeFiles.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                          title="Flyt ned"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeMergeItem(item.id)}
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
                    value={mergeFileName}
                    onChange={(e) => setMergeFileName(e.target.value)}
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
        )}

        {/* ---------------- SPLIT VIEW ---------------- */}
        {activeTab === 'split' && (
          <div>
            <h1 className="text-xl font-bold mb-1">Opdel PDF-fil</h1>
            <p className="text-sm text-slate-500 mb-6">
              Upload et PDF-dokument og angiv de side-intervaller, du vil have gemt som separate filer.
            </p>

            <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors mb-6">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-700">Vælg PDF der skal opdeles</span>
              <span className="text-xs text-slate-400 mt-1">Vælg én fil ad gangen</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleSplitFileChange}
              />
            </label>

            {splitFile && totalPages !== null && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3 overflow-hidden mr-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium truncate text-slate-800">
                      {splitFile.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full shrink-0">
                    {totalPages} {totalPages === 1 ? 'side' : 'sider'}
                  </span>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sideintervaller (adskilt af komma)
                  </label>
                  <input
                    type="text"
                    value={splitRanges}
                    onChange={(e) => setSplitRanges(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="f.eks. 1-2, 3-5"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Eksempel: <code className="bg-slate-100 px-1 py-0.5 rounded">1-2, 3-5</code> opretter to filer: én med side 1–2 og én med side 3–5.
                  </p>
                </div>

                <button
                  onClick={handleSplitAndDownload}
                  disabled={isSplitting || !splitRanges.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
                >
                  <Scissors className="w-4 h-4" />
                  <span>{isSplitting ? 'Opdeler PDF...' : 'Opdel og download filer'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}