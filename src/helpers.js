// src/helpers.js
export const getCurrentWeekString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

export const getWeekStringFromDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    const year = date.getUTCFullYear();
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

export const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export const sanitizeText = (text) => {
    if (typeof text !== 'string') {
        return '';
    }
    // Allow alphanumeric, spaces, and some common punctuation.
    // This will strip out characters often used in scripts or URLs like <, >, /, {, }, etc.
    return text.replace(/[^a-zA-Z0-9 .,_'-]/g, '');
};