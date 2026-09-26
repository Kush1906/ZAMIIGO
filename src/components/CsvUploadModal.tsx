import React, { useState } from 'react';
import { parseOrdersCsv, ParseResult } from '../lib/importCsv';
import { parseFlightCapacityCsv, DepartureScheduleDef } from '../lib/flightPlanning';
import { X, Upload, AlertTriangle, CheckCircle, FileText, Plane } from 'lucide-react';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCsv: (csvText: string, schedules?: DepartureScheduleDef[]) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onApplyCsv }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Flight capacity CSV (optional)
  const [capacityFileName, setCapacityFileName] = useState<string | null>(null);
  const [capacitySchedules, setCapacitySchedules] = useState<DepartureScheduleDef[]>([]);

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

  const handleCapacityFileProcess = (file: File) => {
    setCapacityFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result || '');
      const schedules = parseFlightCapacityCsv(text);
      setCapacitySchedules(schedules);
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
      onApplyCsv(csvContent, capacitySchedules.length > 0 ? capacitySchedules : undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm no-print">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-zamiigo-teal" />
            <h3 className="font-bold text-slate-900 text-base">Import Judge Evaluation Dataset</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Upload the judge's orders CSV and optionally the flight capacity CSV. The engine validates mandatory columns
            (<code className="bg-slate-100 px-1 rounded">order_id</code>, <code className="bg-slate-100 px-1 rounded">household_id</code>,
            <code className="bg-slate-100 px-1 rounded">weight_lb</code>, dimensions) and rejects invalid rows with row numbers.
          </p>

          {/* Orders CSV: Drag & Drop Zone */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">1. Orders CSV (Required)</div>
            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive
                  ? 'border-zamiigo-teal bg-zamiigo-ice/30'
                  : fileName
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">
                {fileName ? `✓ ${fileName}` : 'Drag & Drop your orders CSV here, or '}
                {!fileName && (
                  <label className="text-zamiigo-teal hover:underline cursor-pointer">
                    browse files
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Flight Capacity CSV: Optional Upload */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center space-x-1">
              <Plane className="h-3.5 w-3.5" />
              <span>2. Flight Capacity CSV (Optional — for multi-departure Stage 2)</span>
            </div>
            <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
              capacityFileName ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="text-sm text-slate-600">
                {capacityFileName ? (
                  <span className="font-semibold text-emerald-700">✓ {capacityFileName} — {capacitySchedules.length} departure(s) parsed</span>
                ) : (
                  <label className="text-zamiigo-teal hover:underline cursor-pointer text-xs font-semibold">
                    Upload flight capacity CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleCapacityFileProcess(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                If not provided, the engine auto-detects single vs. multi-day based on order dates.
              </p>
            </div>

            {/* Show parsed schedule preview */}
            {capacitySchedules.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1">
                {capacitySchedules.map(s => (
                  <div key={s.departure_id} className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{s.departure_id}</span>
                    <span>{s.departure_date}</span>
                    <span>{s.available_totes} totes</span>
                    <span>{s.available_payload_lb} lb</span>
                    <span>{s.available_volume_cuft} cu ft</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parse Result Feedback */}
          {parseResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              parseResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center space-x-2 font-bold font-mono">
                {parseResult.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>Valid Dataset: {fileName}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Import Validation Errors</span>
                  </>
                )}
              </div>

              {parseResult.success ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-slate-800">
                  <div>Rows: <strong>{parseResult.stats.rowCount}</strong></div>
                  <div>Orders: <strong>{parseResult.stats.orderCount}</strong></div>
                  <div>Households: <strong>{parseResult.stats.householdCount}</strong></div>
                  <div>Weight: <strong>{parseResult.stats.totalWeightLb} lb</strong></div>
                  <div>Rejected: <strong className={parseResult.stats.rejectedRowCount > 0 ? 'text-amber-600' : ''}>{parseResult.stats.rejectedRowCount}</strong></div>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-[11px] pt-1">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {parseResult.warnings.length > 0 && (
                <div className="text-[11px] text-amber-700 pt-1 border-t border-slate-200">
                  <strong>Notices:</strong> {parseResult.warnings.slice(0, 5).join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!parseResult || !parseResult.success}
            className="px-5 py-2 rounded-xl bg-zamiigo-teal hover:bg-zamiigo-teal-dark disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            Load into Engine
          </button>
        </div>

      </div>
    </div>
  );
};
