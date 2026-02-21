/**
 * Formats a date string or Date object to DD-MM-YYYY format.
 * @param date - The date to format
 * @returns Formatted date string or '--' if invalid
 */
export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '--';

    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '--';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return '--';
    }
};

/**
 * Formats a date string to a more readable format for titles/headers.
 */
export const formatFullDate = (date: string | Date | null | undefined): string => {
    if (!date) return '--';

    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '--';

        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        return '--';
    }
};
