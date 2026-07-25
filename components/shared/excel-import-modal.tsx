'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Table } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/lib/api-client';

export interface SampleField {
  key: string;
  label: string;
  required?: boolean;
  example: string;
}

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  endpoint: string;
  fields: SampleField[];
  entityName: string;
  sampleFilename: string;
  onSuccess: () => void;
}

export function ExcelImportModal({
  open,
  onOpenChange,
  title,
  description,
  endpoint,
  fields,
  entityName,
  sampleFilename,
  onSuccess,
}: ExcelImportModalProps) {
  const api = useApi();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleDownloadTemplate = () => {
    const sampleHeaders: Record<string, string> = {};
    const sampleRow1: Record<string, string> = {};
    const sampleRow2: Record<string, string> = {};

    fields.forEach((f) => {
      sampleHeaders[f.label] = f.label;
      sampleRow1[f.label] = f.example;
      sampleRow2[f.label] = f.example ? `${f.example} (2)` : '';
    });

    const worksheet = XLSX.utils.json_to_sheet([sampleRow1, sampleRow2]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entityName);
    XLSX.writeFile(workbook, `${sampleFilename}_template.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setErrorMsg('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          setErrorMsg('No rows found in the uploaded file');
          setParsedData([]);
          return;
        }

        setParsedData(data);
      } catch (err: any) {
        setErrorMsg('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
        setParsedData([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post<any>(endpoint, { rows: parsedData });
      if (res.success) {
        toast({
          title: 'Import Successful',
          description: res.message || `Successfully imported ${parsedData.length} ${entityName}`,
        });
        setParsedData([]);
        setFileName('');
        onOpenChange(false);
        onSuccess();
      } else {
        setErrorMsg(res.message || 'Import failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setFileName('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action bar for template download */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-xs text-emerald-800">
              <span className="font-medium">Need a sample format?</span> Download our formatted template to populate your records.
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" /> Download Template
            </Button>
          </div>

          {/* Upload Dropzone */}
          {!parsedData.length ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-500 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv)</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-700 truncate">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{fileName}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {parsedData.length} records ready
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                  Change File
                </Button>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><Table className="h-3.5 w-3.5 text-slate-500" /> Data Preview (First 5 Rows)</span>
                  <span>Showing {Math.min(5, parsedData.length)} of {parsedData.length}</span>
                </div>
                <div className="max-h-48 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 border-b font-medium text-slate-600">
                      <tr>
                        {Object.keys(parsedData[0] || {}).slice(0, 6).map((header, idx) => (
                          <th key={idx} className="px-2.5 py-1.5 text-left border-r last:border-0 truncate max-w-[120px]">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {Object.keys(parsedData[0] || {}).slice(0, 6).map((header, cIdx) => (
                            <td key={cIdx} className="px-2.5 py-1 text-slate-700 border-r last:border-0 truncate max-w-[120px]">
                              {String(row[header] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Import {parsedData.length > 0 ? `${parsedData.length} Records` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
