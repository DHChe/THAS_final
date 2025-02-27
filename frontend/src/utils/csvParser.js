// frontend/src/utils/csvParser.ts

import Papa from 'papaparse';

export const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
      return obj;
    }, {});
  });
};