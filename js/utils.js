// utils.js - Currency and formatting utilities

// Set your default currency
const DEFAULT_CURRENCY = 'MWK';
const CURRENCY_SYMBOL = 'MK';

// Format currency for Malawi Kwacha
function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
    if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL} 0`;
    
    // Malawi Kwacha doesn't use decimals/paisa
    // Round to nearest whole number
    const wholeAmount = Math.round(amount);
    
    // Format with commas for thousands
    const formattedAmount = wholeAmount.toLocaleString('en-MW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return `${CURRENCY_SYMBOL} ${formattedAmount}`;
}

// Format amount without symbol (for calculations)
function parseCurrency(formattedValue) {
    // Remove MK symbol and commas, convert to number
    const numericValue = formattedValue
        .replace(/[^0-9.-]/g, '')
        .replace(/,/g, '');
    
    return parseFloat(numericValue) || 0;
}

// Format for input fields (show without symbol)
function formatAmountForInput(amount) {
    return Math.round(amount).toString();
}

// Export functions
window.formatCurrency = formatCurrency;
window.parseCurrency = parseCurrency;
window.formatAmountForInput = formatAmountForInput;
