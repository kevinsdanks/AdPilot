
import Papa from 'papaparse';
import { DataRow } from '../types';

export const parseCSV = (csvText: string): { data: DataRow[], excludedCount: number } => {
  // Pre-process to detect delimiter using the first line
  let textToProcess = csvText.trim();
  // Remove BOM if present
  if (textToProcess.charCodeAt(0) === 0xFEFF) {
    textToProcess = textToProcess.slice(1);
  }

  const lines = textToProcess.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return { data: [], excludedCount: 0 };

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  // User Rule: If more semicolons than commas, use semicolon.
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  // Parse using PapaParse
  const result = Papa.parse(textToProcess, {
    header: true,
    delimiter: delimiter,
    skipEmptyLines: true,
    dynamicTyping: true, // Converts numbers and booleans automatically
    quoteChar: '"',
    transformHeader: (h) => h.trim() // Normalize headers by trimming
  });

  // Validation: Check for significant structural errors
  if (result.errors.length > 0) {
     const mismatchErrors = result.errors.filter(e => e.type === 'FieldMismatch');
     const totalRows = result.data.length + mismatchErrors.length; 
     
     if (totalRows > 0 && (mismatchErrors.length / totalRows) > 0.2) {
         throw new Error("CSV parsing issue detected. Please re-export from Meta or try another delimiter.");
     }
  }

  const allData = result.data as DataRow[];

  // Filter out Summary/Total rows
  // Optimization: Filter logic is now slightly stricter but faster
  const cleanData = [];
  let excludedCount = 0;

  for (const row of allData) {
      if (isSummaryRow(row)) {
          excludedCount++;
      } else {
          cleanData.push(row);
      }
  }

  return { data: cleanData, excludedCount };
};

const isSummaryRow = (row: DataRow): boolean => {
  const values = Object.values(row);
  
  // Fast check: If any value implies a summary row
  for (const val of values) {
      if (typeof val === 'string') {
          const lower = val.toLowerCase();
          if (lower === 'total' || lower === 'grand total' || lower === 'results' || lower === 'summary' || lower === 'kopsumma' || lower === 'kopā') {
              return true;
          }
          if (lower.startsWith('results from')) return true;
      }
  }

  const keys = Object.keys(row);
  
  // Identify Spend column for numeric checks
  const spendKey = keys.find(k => /spend|cost|amount|summa/i.test(k));
  const hasSpend = spendKey && typeof row[spendKey] === 'number';

  // ID Check: If ID is missing/zero but we have spend, it's likely a summary line
  // Many CSV exports have empty IDs for the "Total" row at the bottom
  const idKey = keys.find(k => /id/i.test(k) && !/guid|uuid|currency/i.test(k));
  
  if (hasSpend && idKey) {
      const idVal = row[idKey];
      if (!idVal || idVal === '0' || idVal === 0) return true;
  }

  return false;
};

export const exportToCSV = (data: DataRow[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  // Optimization: Use a simpler map for export to avoid regex overhead on large datasets
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      const val = row[fieldName];
      if (val === null || val === undefined) return '';
      const strVal = String(val);
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(','))
  ];
  return csvRows.join('\n');
};

export const detectCurrency = (headers: string[]): string => {
  const joined = headers.join(' ').toUpperCase();
  if (joined.includes('(EUR)')) return 'EUR';
  if (joined.includes('(GBP)')) return 'GBP';
  if (joined.includes('(AUD)')) return 'AUD';
  if (joined.includes('(CAD)')) return 'CAD';
  if (joined.includes('(BRL)')) return 'BRL';
  if (joined.includes('(INR)')) return 'INR';
  if (joined.includes('(JPY)')) return 'JPY';
  return 'USD';
};
