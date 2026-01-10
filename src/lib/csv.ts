import { stringify } from 'csv-stringify/sync';

type CsvPrimitive = string | number | boolean | null | undefined;

export type CsvColumn<T> = {
  key: keyof T;
  header: string;
};

export function buildCsv<T extends Record<string, CsvPrimitive>>(
  rows: T[],
  columns: CsvColumn<T>[]
): string {
  return stringify(rows, {
    header: true,
    columns: columns.map(column => ({
      key: String(column.key),
      header: column.header,
    })),
  });
}
