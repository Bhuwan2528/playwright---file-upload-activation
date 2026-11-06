
export interface ExcelHeader {
    name: string;
    column: number;
}

/**
 * Normalize Excel column names.
 * Example:
 * "Serial Number" -> "serialnumber"
 * "Serial_Number" -> "serialnumber"
 * "Serial-Number" -> "serialnumber"
 */
export function normalizeHeader(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

/**
 * Find a column using accepted aliases.
 * Throws an error if the column is missing or ambiguous.
 */
export function findColumnByAliases(
    headers: ExcelHeader[],
    fieldName: string,
    aliases: string[]
): number {

    const normalizedAliases = new Set(
        aliases.map(normalizeHeader)
    );

    const matches = headers.filter(header =>
        normalizedAliases.has(normalizeHeader(header.name))
    );

    if (matches.length === 0) {
        throw new Error(
            `${fieldName} column not found. Accepted names: ${aliases.join(", ")}`
        );
    }

    if (matches.length > 1) {
        throw new Error(
            `Multiple columns found for ${fieldName}: ${
                matches.map(item => item.name).join(", ")
            }`
        );
    }

    return matches[0]!.column;
}

/**
 * Convert an Excel date value into a valid JavaScript Date.
 * Supports Date objects, Excel serial numbers and common date strings.
 */
export function parseExcelDate(value: unknown): Date | null {

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    // Excel serial date
    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 1 || value > 2958465) {
            return null;
        }

        const date = new Date(
            Date.UTC(1899, 11, 30) + value * 86400000
        );

        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const input = value.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    const indianDate = input.match(
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    );

    if (indianDate) {
        const [, day, month, year] = indianDate;

        const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );

        if (
            date.getFullYear() !== Number(year) ||
            date.getMonth() !== Number(month) - 1 ||
            date.getDate() !== Number(day)
        ) {
            return null;
        }

        return date;
    }

    // Other standard date formats
    const timestamp = Date.parse(input);

    if (Number.isNaN(timestamp)) {
        return null;
    }

    return new Date(timestamp);
}
