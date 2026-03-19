// dashboard.js - Additional dashboard functionality

// View transaction details
function viewTransaction(transactionId) {
    // You can implement a modal or navigate to transaction details
    console.log('Viewing transaction:', transactionId);
    
    // For now, just show a notification
    showNotification('Transaction details coming soon!', 'info');
    
    // In the future, you could open a modal:
    // openTransactionModal(transactionId);
}

// Refresh dashboard data
async function refreshDashboard() {
    if (!currentUser) return;
    
    showNotification('Refreshing dashboard...', 'info');
    
    try {
        await loadDashboardData(currentUser.uid);
        showNotification('Dashboard updated!', 'success');
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        showNotification('Failed to refresh dashboard', 'error');
    }
}

// Export dashboard data
async function exportDashboardData() {
    if (!currentUser) return;
    
    try {
        const [expenses, income] = await Promise.all([
            db.collection('expenses').where('userId', '==', currentUser.uid).get(),
            db.collection('income').where('userId', '==', currentUser.uid).get()
        ]);
        
        const data = {
            expenses: expenses.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            income: income.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        showNotification('Data exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Make functions globally available
window.viewTransaction = viewTransaction;
window.refreshDashboard = refreshDashboard;
window.exportDashboardData = exportDashboardData;
