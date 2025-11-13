/**
 * Database column type mappings for SQLite compatibility
 */
export const ColumnTypes = {
  // JSON type - SQLite uses TEXT for JSON
  JSON: 'text',

  // Text types
  TEXT: 'text',
  VARCHAR: (length?: number) => length ? `varchar(${length})` : 'varchar',

  // Date/Time types - SQLite uses TEXT for datetime
  DATETIME: 'datetime',
  TIMESTAMP: 'datetime',

  // Numeric types
  INTEGER: 'integer',
  BIGINT: 'bigint',
  DECIMAL: (precision?: number, scale?: number) =>
    precision && scale ? `decimal(${precision},${scale})` : 'decimal',

  // Boolean type
  BOOLEAN: 'boolean',
} as const;

/**
 * Helper to get JSON column definition for current database
 */
export const getJsonColumnType = () => ({
  type: ColumnTypes.JSON as any,
  transformer: {
    to: (value: any) => value ? JSON.stringify(value) : null,
    from: (value: string) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
  },
});

/**
 * Helper to get timestamp column definition
 */
export const getTimestampColumnType = () => ({
  type: ColumnTypes.DATETIME as any,
});

/**
 * Helper to get integer column definition
 */
export const getIntegerColumnType = () => ({
  type: ColumnTypes.INTEGER as any,
});

/**
 * Helper to get decimal column definition
 */
export const getDecimalColumnType = (precision: number = 10, scale: number = 2) => ({
  type: ColumnTypes.DECIMAL(precision, scale) as any,
});
