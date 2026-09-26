import React, { useState } from 'react';
import { parseOrdersCsv, ParseResult } from '../lib/importCsv';
import { X, Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCsv: (csvText: string) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onApplyCsv }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result || '');
      setCsvContent(text);
      const parsed = parseOrdersCsv(text);
      setParseResult(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApply = () => {
    if (parseResult && parseResult.success && csvContent) {
      onApplyCsv(csvContent);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Import Grocery Orders CSV</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400">
            Upload an official judge evaluation CSV. The parser validates mandatory columns (<code>order_id</code>, <code>household_id</code>, <code>weight_lb</code>, <code>length_in</code>, <code>width_in</code>, <code>height_in</code>) and calculates tote & flight limits instantly.
          </p>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-sky-500 bg-sky-950/30'
                : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
            }`}
          >
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-200">
              Drag & Drop your CSV file here, or{' '}
              <label className="text-sky-400 hover:text-sky-300 cursor-pointer underline">
                browse files
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1">Accepts standard Zamiigo / Superstore batch CSV formats</p>
          </div>

          {/* Parse Result Feedback */}
          {parseResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              parseResult.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center space-x-2 font-bold font-mono">
                {parseResult.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Valid Dataset: {fileName}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Import Validation Errors</span>
                  </>
                )}
              </div>

              {parseResult.success ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-slate-200">
                  <div>Rows: <strong>{parseResult.stats.rowCount}</strong></div>
                  <div>Orders: <strong>{parseResult.stats.orderCount}</strong></div>
                  <div>Households: <strong>{parseResult.stats.householdCount}</strong></div>
                  <div>Weight: <strong>{parseResult.stats.totalWeightLb} lb</strong></div>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-[11px] pt-1 text-rose-200">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {parseResult.warnings.length > 0 && (
                <div className="text-[11px] text-amber-300 pt-1 border-t border-slate-800">
                  <strong>Notices:</strong> {parseResult.warnings.slice(0, 3).join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!parseResult || !parseResult.success}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            Load into Engine
          </button>
        </div>

      </div>
    </div>
  );
};
