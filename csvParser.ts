import { parse } from 'papaparse';

export interface CSVRow {
  [key: string]: string | number | boolean | null;
}

export const parseCSV = async (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          reject(new Error('Error parsing CSV file'));
          return;
        }
        resolve(results.data);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      },
    });
  });
};

export const generateCSVTemplate = (headers: string[]): string => {
  return headers.join(',') + '\n';
};

export const validateCSVHeaders = (headers: string[], requiredHeaders: string[]): { isValid: boolean; missingHeaders: string[] } => {
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
  };
};
