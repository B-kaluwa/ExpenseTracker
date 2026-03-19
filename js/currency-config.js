// currency-config.js - Central currency management

const currencyConfig = {
    // Default currency
    defaultCurrency: 'MWK',
    
    // Available currencies
    currencies: {
        MWK: {
            symbol: 'MK',
            code: 'MWK',
            name: 'Malawi Kwacha',
            decimals: 0,
            locale: 'en-MW'
        },
        USD: {
            symbol: '$',
            code: 'USD',
            name: 'US Dollar',
            decimals: 2,
            locale: 'en-US'
        },
        EUR: {
            symbol: '€',
            code: 'EUR',
            name: 'Euro',
            decimals: 2,
            locale: 'de-DE'
        },
        GBP: {
            symbol: '£',
            code: 'GBP',
            name: 'British Pound',
            decimals: 2,
            locale: 'en-GB'
        },
        ZAR: {
            symbol: 'R',
            code: 'ZAR',
            name: 'South African Rand',
            decimals: 2,
            locale: 'en-ZA'
        }
    },
    
    // Get current user's currency (from localStorage or default)
    getCurrentCurrency: function() {
        const saved = localStorage.getItem('preferredCurrency');
        return saved || this.defaultCurrency;
    },
    
    // Format amount according to currency
    format: function(amount, currencyCode = null) {
        const code = currencyCode || this.getCurrentCurrency();
        const config = this.currencies[code] || this.currencies[this.defaultCurrency];
        
        // Round to appropriate decimals
        const roundedAmount = amount.toFixed(config.decimals);
        
        // Format with locale
        const formatted = new Intl.NumberFormat(config.locale, {
            minimumFractionDigits: config.decimals,
            maximumFractionDigits: config.decimals
        }).format(roundedAmount);
        
        return `${config.symbol} ${formatted}`;
    }
};

// Make globally available
window.currencyConfig = currencyConfig;
window.formatCurrency = (amount) => currencyConfig.format(amount);
