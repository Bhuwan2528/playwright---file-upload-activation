export function formatDate_DDMMYYYY(value: unknown): string {

    let day: number;
    let month: number;
    let year: number;

    // Case 1: JavaScript Date object
    if (value instanceof Date) {

        if (isNaN(value.getTime())) {
            return '';
        }

        day = value.getDate();
        month = value.getMonth() + 1;
        year = value.getFullYear();
    }

    // Case 2: Excel serial date number
    else if (typeof value === 'number') {

        if (!Number.isFinite(value) || value <= 0) {
            return '';
        }

        const date = new Date(
            Date.UTC(1899, 11, 30) + value * 86400000
        );

        if (isNaN(date.getTime())) {
            return '';
        }

        day = date.getUTCDate();
        month = date.getUTCMonth() + 1;
        year = date.getUTCFullYear();
    }

    // Case 3: Date as text
    else if (typeof value === 'string') {

        const date = value.trim();

        if (!date) {
            return '';
        }

        // YYYY-MM-DD or YYYY/MM/DD
        let match = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

        if (match) {
            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
        }

        // DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY
        else {

            match = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

            if (!match) {
                return '';
            }

            const first = Number(match[1]);
            const second = Number(match[2]);
            year = Number(match[3]);

            // If first number is greater than 12,
            // it must be the day.
            if (first > 12) {
                day = first;
                month = second;
            }

            // If second number is greater than 12,
            // it must be the day.
            else if (second > 12) {
                month = first;
                day = second;
            }

            // Both numbers are 12 or less:
            // Assume MM/DD/YYYY.
            else {
                month = first;
                day = second;
            }
        }
    }

    else {
        return '';
    }

    // Validate date
    const checkDate = new Date(Date.UTC(year, month - 1, day));

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        checkDate.getUTCFullYear() !== year ||
        checkDate.getUTCMonth() + 1 !== month ||
        checkDate.getUTCDate() !== day
    ) {
        return '';
    }

    // Final output: DD-MM-YYYY
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month).padStart(2, '0');

    return `${formattedDay}-${formattedMonth}-${year}`;
}
