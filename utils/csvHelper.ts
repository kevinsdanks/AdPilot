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
     // Check for FieldMismatch (rows with wrong number of columns)
     const mismatchErrors = result.errors.filter(e => e.type === 'FieldMismatch');
     const totalRows = result.data.length + mismatchErrors.length; 
     
     // If significant portion of rows have mismatches, it's likely a critical parsing failure
     if (totalRows > 0 && (mismatchErrors.length / totalRows) > 0.2) {
         throw new Error("CSV parsing issue detected. Please re-export from Meta or try another delimiter.");
     }
     
     if (mismatchErrors.length > 0) {
         console.warn("CSV Parse Warnings:", result.errors);
     }
  }

  const allData = result.data as DataRow[];

  // Filter out Summary/Total rows
  const cleanData = allData.filter(row => !isSummaryRow(row));
  const excludedCount = allData.length - cleanData.length;

  return { data: cleanData, excludedCount };
};

const isSummaryRow = (row: DataRow): boolean => {
  const keys = Object.keys(row);

  // 1. Keyword Check in Name Columns
  const nameKeys = keys.filter(k => /campaign|ad ?set|ad ?group|ad ?name|name/i.test(k));
  const keysToCheck = nameKeys.length > 0 ? nameKeys : keys;
  
  for (const key of keysToCheck) {
      const val = row[key];
      if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          // Added 'overall' to the exclusion list as per rules
          if (['total', 'grand total', 'summary', 'kopā', 'results', 'all', 'overall'].includes(lower)) return true;
          if (lower.startsWith('results from')) return true;
      }
  }

  // Identify Spend column for numeric checks
  const spendKey = keys.find(k => /spend|cost|amount/i.test(k));
  const hasSpend = spendKey && typeof row[spendKey] === 'number' && Number(row[spendKey]) > 0;

  // 2. ID Check: ID is 0 or missing AND spend > 0
  const idKeys = keys.filter(k => /id/i.test(k) && !/guid|uuid|currency/i.test(k));
  
  if (hasSpend && idKeys.length > 0) {
      const allIdsInvalid = idKeys.every(k => {
          const val = row[k];
          return val === '0' || val === 0 || val === '' || val === null || val === undefined;
      });
      if (allIdsInvalid) return true;
  }

  // 3. Empty Name Check: Name is empty but has Spend
  if (hasSpend && nameKeys.length > 0) {
       const allNamesEmpty = nameKeys.every(k => {
          const val = row[k];
          return !val || (typeof val === 'string' && val.trim() === '');
       });
       if (allNamesEmpty) return true;
  }

  return false;
};

export const exportToCSV = (data: DataRow[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
      const val = row[fieldName]?.toString() ?? '';
      return `"${val.replace(/"/g, '""')}"`;
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