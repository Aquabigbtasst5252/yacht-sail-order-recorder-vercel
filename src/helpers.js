// src/helpers.js
import { getISOWeek, getISOWeekYear } from 'date-fns';

export const getCurrentWeekString = () => {
    const now = new Date();
    const year = getISOWeekYear(now);
    const weekNumber = getISOWeek(now);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

export const getWeekStringFromDate = (dateString) => {
    if (!dateString) return '';
    // Parse the date as UTC to avoid timezone issues
    const date = new Date(dateString + 'T00:00:00Z');
    const year = getISOWeekYear(date);
    const weekNumber = getISOWeek(date);
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