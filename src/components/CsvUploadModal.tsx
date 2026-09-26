import React, { useState } from 'react';
import { parseOrdersCsv, ParseResult } from '../lib/importCsv';
import { parseFlightCapacityCsv, DepartureScheduleDef, CapacityParseResult } from '../lib/flightPlanning';
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

  const [capacityFileName, setCapacityFileName] = useState<string | null>(null);
  const [capacityResult, setCapacityResult] = useState<CapacityParseResult | null>(null);

  if (!isOpen) return null;

  const resetCapacity = () => {
    setCapacityFileName(null);
    setCapacityResult(null);
  };

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result || '');
      setCsvContent(text);
      setParseResult(parseOrdersCsv(text));
    };
    reader.readAsText(file);
  };

  const handleCapacityFileProcess = (file: File) => {
    setCapacityFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = String(e.target?.result || '');
      setCapacityResult(parseFlightCapacityCsv(text));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]);
  };

  const capacityOk = capacityResult && capacityResult.errors.length === 0 && capacityResult.schedules.length > 0;

  const handleApply = () => {
    if (parseResult?.success && csvContent) {
      const schedules = capacityOk ? capacityResult!.schedules : undefined;
      onApplyCsv(csvContent, schedules);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm no-print">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-zamiigo-teal" />
            <h3 className="font-bold text-slate-900 text-base">Import Judge Evaluation Dataset</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500">
            Upload the judge's orders CSV. For multi-departure (Stage 2) runs, also upload the flight capacity CSV — otherwise the engine uses a <strong>single departure</strong> on the earliest order date.
          </p>

          {/* Orders CSV */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">1. Orders CSV (Required)</div>
            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive ? 'border-zamiigo-teal bg-zamiigo-ice/30' :
                fileName ? 'border-emerald-300 bg-emerald-50/30' :
                'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
            >
              <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800">
                {fileName ? `✓ ${fileName}` : (
                  <>Drag & Drop orders CSV here, or{' '}
                    <label className="text-zamiigo-teal hover:underline cursor-pointer">
                      browse files
                      <input type="file" accept=".csv,text/csv" className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileProcess(e.target.files[0])} />
                    </label>
                  </>
                )}
              </div>
              {fileName && (
                <button className="text-xs text-slate-400 hover:text-rose-600 mt-1 underline"
                  onClick={() => { setFileName(null); setCsvContent(''); setParseResult(null); }}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Parse Result */}
          {parseResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              parseResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center space-x-2 font-bold font-mono">
                {parseResult.success
                  ? <><CheckCircle className="h-4 w-4 text-emerald-600" /><span>Valid — {fileName}</span></>
                  : <><AlertTriangle className="h-4 w-4 text-rose-600" /><span>Validation Errors</span></>}
              </div>
              {parseResult.success ? (
                <div className="grid grid-cols-5 gap-2 pt-1 font-mono text-slate-800">
                  <div>Rows: <strong>{parseResult.stats.rowCount}</strong></div>
                  <div>Orders: <strong>{parseResult.stats.orderCount}</strong></div>
                  <div>Households: <strong>{parseResult.stats.householdCount}</strong></div>
                  <div>Weight: <strong>{parseResult.stats.totalWeightLb} lb</strong></div>
                  <div>Rejected: <strong className={parseResult.stats.rejectedRowCount > 0 ? 'text-amber-600' : ''}>{parseResult.stats.rejectedRowCount}</strong></div>
                </div>
              ) : (
                <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1">
                  {parseResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {parseResult.warnings.length > 0 && (
                <div className="text-[11px] text-amber-700 pt-1 border-t border-slate-200">
                  <strong>Notices:</strong> {parseResult.warnings.slice(0, 4).join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Flight Capacity CSV */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
              <Plane className="h-3.5 w-3.5" />
              <span>2. Flight Capacity CSV (Required for multi-departure)</span>
            </div>
            <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
              !capacityFileName ? 'border-slate-200 bg-slate-50' :
              capacityOk ? 'border-emerald-300 bg-emerald-50/30' : 'border-rose-300 bg-rose-50/30'
            }`}>
              {!capacityFileName ? (
                <>
                  <label className="text-zamiigo-teal hover:underline cursor-pointer text-xs font-semibold">
                    Upload flight_capacity.csv
                    <input type="file" accept=".csv,text/csv" className="hidden"
                      onChange={e => e.target.files?.[0] && handleCapacityFileProcess(e.target.files[0])} />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Columns: departure_date, available_totes, available_payload_lb, available_volume_cuft
                  </p>
                </>
              ) : capacityOk ? (
                <div className="text-xs text-emerald-700 font-semibold">
                  ✓ {capacityFileName} — {capacityResult!.schedules.length} departure(s) parsed
                  <button className="ml-3 text-slate-400 hover:text-rose-600 underline font-normal" onClick={resetCapacity}>Remove</button>
                </div>
              ) : (
                <div className="text-xs text-rose-700 space-y-1">
                  <div className="font-bold">✗ Capacity file errors — {capacityFileName}</div>
                  {capacityResult?.errors.map((e, i) => <div key={i} className="text-[11px]">{e}</div>)}
                  <button className="text-slate-400 hover:text-rose-600 underline text-[11px]" onClick={resetCapacity}>Remove and try again</button>
                </div>
              )}
            </div>

            {/* Schedule preview */}
            {capacityOk && capacityResult!.schedules.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono space-y-1">
                {capacityResult!.schedules.map(s => (
                  <div key={s.departure_id} className="flex items-center justify-between gap-3 text-slate-600">
                    <span className="font-bold text-slate-800 w-20">{s.departure_id}</span>
                    <span className="w-24">{s.departure_date}</span>
                    <span>{s.available_totes} totes</span>
                    <span>{s.available_payload_lb} lb</span>
                    <span>{s.available_volume_cuft} cu ft</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warning when no capacity file is provided */}
            {!capacityFileName && parseResult?.success && (
              <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ No capacity CSV provided. The engine will use a <strong>single departure on the earliest order date</strong> with full Cessna 208 capacity (90 totes / 2,877 lb / 187.5 cu ft). Add the capacity CSV above for multi-departure scheduling.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {capacityOk ? `✓ ${capacityResult!.schedules.length} departure(s) loaded` : 'Single-departure mode'}
          </span>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!parseResult?.success || (!!capacityFileName && !capacityOk)}
              className="px-5 py-2 rounded-xl bg-zamiigo-teal hover:bg-zamiigo-teal-dark disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition"
            >
              Load into Engine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
