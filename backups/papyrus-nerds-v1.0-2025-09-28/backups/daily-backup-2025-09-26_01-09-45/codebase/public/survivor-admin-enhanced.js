/**
 * 🎯 ENHANCED SURVIVOR ADMIN - LIGHTNING-FAST EMBEDDED DATA INTERFACE
 *
 * This script leverages the embedded survivor data for sub-100ms performance
 * and provides comprehensive admin capabilities for survivor pool management.
 */

class EnhancedSurvivorAdmin {
    constructor() {
        this.allUsers = [];
        this.filteredUsers = [];
        this.selectedUsers = new Set();
        this.sortColumn = 'name';
        this.sortDirection = 'asc';
        this.currentEditUser = null;
        this.loadStartTime = Date.now();

        this.init();
    }

    async init() {
        console.log('🎯 Initializing Enhanced Survivor Admin...');

        // Wait for Firebase to be ready
        await this.waitForFirebase();

        // Load embedded data
        await this.loadEmbeddedSurvivorData();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize interface
        this.renderUserTable();
        this.updateStatistics();

        // Calculate and display load time
        const loadTime = Date.now() - this.loadStartTime;
        document.getElementById('load-time').textContent = loadTime;

        console.log(`✅ Enhanced Survivor Admin loaded in ${loadTime}ms`);
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.db && window.firebaseUtils) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    async loadEmbeddedSurvivorData() {
        try {
            console.log('📊 Loading embedded survivor data...');
            const startTime = Date.now();

            // Single query for ALL survivor data - this is the breakthrough!
            const poolDoc = await window.firebaseUtils.getDoc(
                window.firebaseUtils.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members')
            );

            if (!poolDoc.exists()) {
                throw new Error('Pool members document not found');
            }

            const poolData = poolDoc.data();
            this.allUsers = [];

            // Process embedded survivor data
            Object.entries(poolData).forEach(([userId, userData]) => {
                if (userData.survivor) {
                    this.allUsers.push({
                        userId,
                        name: userData.displayName || 'Unknown',
                        email: userData.email || 'Unknown',
                        alive: userData.survivor.alive,
                        pickHistory: userData.survivor.pickHistory || '',
                        totalPicks: userData.survivor.totalPicks || 0,
                        lastUpdated: userData.survivor.lastUpdated,
                        manualOverride: userData.survivor.manualOverride || false,
                        status: userData.survivor.alive === 18 ? 'alive' : 'eliminated',
                        statusText: userData.survivor.alive === 18 ? 'ALIVE' : `ELIMINATED Week ${userData.survivor.alive}`
                    });
                }
            });

            const loadTime = Date.now() - startTime;
            console.log(`✅ Loaded ${this.allUsers.length} users in ${loadTime}ms`);

            // Hide loading state
            document.getElementById('loading-state').style.display = 'none';

            // Apply initial filter
            this.applyFilters();

        } catch (error) {
            console.error('❌ Error loading survivor data:', error);
            this.showMessage('Error loading survivor data: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        // Search and filter
        document.getElementById('search-input').addEventListener('input', () => this.applyFilters());
        document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());

        // CSV Export
        document.getElementById('csv-export-btn').addEventListener('click', () => this.exportCSV());

        // Bulk actions
        document.getElementById('bulk-actions-btn').addEventListener('click', () => this.showBulkActionsModal());
        document.getElementById('cancel-bulk').addEventListener('click', () => this.hideBulkActionsModal());

        // Select all checkbox
        document.getElementById('select-all').addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));

        // Table sorting
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => this.sortTable(header.dataset.sort));
        });

        // User edit modal
        document.getElementById('cancel-edit').addEventListener('click', () => this.hideUserEditModal());
        document.getElementById('save-user-changes').addEventListener('click', () => this.saveUserChanges());
        document.getElementById('eliminate-user').addEventListener('click', () => this.eliminateUser());
        document.getElementById('resurrect-user').addEventListener('click', () => this.resurrectUser());

        // Bulk action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBulkAction(e.target.closest('[data-action]').dataset.action));
        });

        // Modal close on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;

        this.filteredUsers = this.allUsers.filter(user => {
            // Search filter
            const matchesSearch = !searchTerm ||
                user.name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.pickHistory.toLowerCase().includes(searchTerm);

            // Status filter
            let matchesStatus = true;
            if (statusFilter === 'alive') {
                matchesStatus = user.status === 'alive';
            } else if (statusFilter === 'eliminated') {
                matchesStatus = user.status === 'eliminated';
            } else if (statusFilter === 'week1') {
                matchesStatus = user.alive === 1;
            } else if (statusFilter === 'week2') {
                matchesStatus = user.alive === 2;
            }

            return matchesSearch && matchesStatus;
        });

        this.renderUserTable();
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredUsers.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];

            if (column === 'name') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            } else if (column === 'status') {
                valueA = a.alive;
                valueB = b.alive;
            } else if (column === 'picks') {
                valueA = a.totalPicks;
                valueB = b.totalPicks;
            }

            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderUserTable();
    }

    renderUserTable() {
        const tbody = document.getElementById('user-table-body');

        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-search text-3xl mb-2 block"></i>
                        No users found matching your criteria
                    </td>
                </tr>
            `;
            document.getElementById('table-count').textContent = '0 users';
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(user => {
            const isSelected = this.selectedUsers.has(user.userId);
            const statusClass = user.status === 'alive' ? 'alive' : 'eliminated';
            const statusColor = user.status === 'alive' ? 'text-green-600' : 'text-red-600';

            return `
                <tr class="user-row ${statusClass} hover:bg-gray-50 transition-colors" data-user-id="${user.userId}">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" class="user-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                               data-user-id="${user.userId}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div>
                                <div class="text-sm font-medium text-gray-900">${user.name}</div>
                                <div class="text-sm text-gray-500">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} bg-opacity-10">
                            <i class="fas ${user.status === 'alive' ? 'fa-heart' : 'fa-skull'} mr-1"></i>
                            ${user.statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 max-w-xs truncate" title="${user.pickHistory}">
                            ${user.pickHistory || 'No picks'}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            ${user.totalPicks} picks
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex space-x-2 mobile-stack">
                            <button onclick="survivorAdmin.editUser('${user.userId}')"
                                    class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                                <i class="fas fa-edit mr-1"></i>Edit
                            </button>
                            ${user.status === 'alive' ?
                                `<button onclick="survivorAdmin.quickEliminate('${user.userId}')"
                                         class="text-red-600 hover:text-red-900 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">
                                    <i class="fas fa-skull mr-1"></i>Eliminate
                                </button>` :
                                `<button onclick="survivorAdmin.quickResurrect('${user.userId}')"
                                         class="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded border border-yellow-200 hover:bg-yellow-50 transition-colors">
                                    <i class="fas fa-heart mr-1"></i>Resurrect
                                </button>`
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Update table count
        document.getElementById('table-count').textContent = `${this.filteredUsers.length} users`;

        // Setup checkbox listeners
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleUserSelection(e.target.dataset.userId, e.target.checked));
        });
    }

    updateStatistics() {
        const total = this.allUsers.length;
        const alive = this.allUsers.filter(u => u.status === 'alive').length;
        const eliminated = this.allUsers.filter(u => u.status === 'eliminated').length;
        const survivalRate = total > 0 ? Math.round((alive / total) * 100) : 0;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-alive').textContent = alive;
        document.getElementById('stat-eliminated').textContent = eliminated;
        document.getElementById('stat-survival-rate').textContent = `${survivalRate}%`;
    }

    toggleUserSelection(userId, selected) {
        if (selected) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }

        // Update select all checkbox
        const allCheckboxes = document.querySelectorAll('.user-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        const selectAllCheckbox = document.getElementById('select-all');

        if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
        }
    }

    toggleSelectAll(selected) {
        this.selectedUsers.clear();

        if (selected) {
            this.filteredUsers.forEach(user => this.selectedUsers.add(user.userId));
        }

        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.checked = selected;
        });
    }

    editUser(userId) {
        const user = this.allUsers.find(u => u.userId === userId);
        if (!user) return;

        this.currentEditUser = user;

        // Populate modal
        document.getElementById('edit-user-name').textContent = user.name;
        document.getElementById('edit-alive-status').value = user.alive;
        document.getElementById('edit-pick-history').value = user.pickHistory;
        document.getElementById('edit-override-reason').value = '';

        this.showUserEditModal();
    }

    async saveUserChanges() {
        if (!this.currentEditUser) return;

        const newAliveStatus = parseInt(document.getElementById('edit-alive-status').value);
        const newPickHistory = document.getElementById('edit-pick-history').value.trim();
        const overrideReason = document.getElementById('edit-override-reason').value.trim();

        try {
            const updates = {
                [`${this.currentEditUser.userId}.survivor.alive`]: newAliveStatus,
                [`${this.currentEditUser.userId}.survivor.pickHistory`]: newPickHistory,
                [`${this.currentEditUser.userId}.survivor.totalPicks`]: newPickHistory ? newPickHistory.split(',').length : 0,
                [`${this.currentEditUser.userId}.survivor.lastUpdated`]: new Date().toISOString(),
                [`${this.currentEditUser.userId}.survivor.manualOverride`]: true
            };

            if (overrideReason) {
                updates[`${this.currentEditUser.userId}.survivor.overrideReason`] = overrideReason;
            }

            await window.firebaseUtils.updateDoc(
                window.firebaseUtils.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'),
                updates
            );

            this.showMessage(`Updated ${this.currentEditUser.name} successfully`, 'success');
            this.hideUserEditModal();
            await this.refreshData();

        } catch (error) {
            console.error('Error updating user:', error);
            this.showMessage('Error updating user: ' + error.message, 'error');
        }
    }

    async quickEliminate(userId) {
        const user = this.allUsers.find(u => u.userId === userId);
        if (!user || !confirm(`Eliminate ${user.name}?`)) return;

        try {
            const updates = {
                [`${userId}.survivor.alive`]: 2, // Eliminate in current week
                [`${userId}.survivor.lastUpdated`]: new Date().toISOString(),
                [`${userId}.survivor.manualOverride`]: true
            };

            await window.firebaseUtils.updateDoc(
                window.firebaseUtils.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'),
                updates
            );

            this.showMessage(`${user.name} eliminated successfully`, 'success');
            await this.refreshData();

        } catch (error) {
            console.error('Error eliminating user:', error);
            this.showMessage('Error eliminating user: ' + error.message, 'error');
        }
    }

    async quickResurrect(userId) {
        const user = this.allUsers.find(u => u.userId === userId);
        if (!user || !confirm(`Resurrect ${user.name}?`)) return;

        try {
            const updates = {
                [`${userId}.survivor.alive`]: 18, // Resurrect to alive
                [`${userId}.survivor.lastUpdated`]: new Date().toISOString(),
                [`${userId}.survivor.manualOverride`]: true
            };

            await window.firebaseUtils.updateDoc(
                window.firebaseUtils.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'),
                updates
            );

            this.showMessage(`${user.name} resurrected successfully`, 'success');
            await this.refreshData();

        } catch (error) {
            console.error('Error resurrecting user:', error);
            this.showMessage('Error resurrecting user: ' + error.message, 'error');
        }
    }

    eliminateUser() {
        document.getElementById('edit-alive-status').value = '2';
    }

    resurrectUser() {
        document.getElementById('edit-alive-status').value = '18';
    }

    async handleBulkAction(action) {
        if (this.selectedUsers.size === 0) {
            this.showMessage('No users selected', 'warning');
            return;
        }

        const userCount = this.selectedUsers.size;
        const confirmMessage = {
            'eliminate-selected': `Eliminate ${userCount} selected users?`,
            'resurrect-selected': `Resurrect ${userCount} selected users?`,
            'process-week': `Process weekly eliminations for ${userCount} selected users?`
        };

        if (!confirm(confirmMessage[action])) return;

        try {
            const updates = {};

            this.selectedUsers.forEach(userId => {
                if (action === 'eliminate-selected') {
                    updates[`${userId}.survivor.alive`] = 2;
                } else if (action === 'resurrect-selected') {
                    updates[`${userId}.survivor.alive`] = 18;
                }
                updates[`${userId}.survivor.lastUpdated`] = new Date().toISOString();
                updates[`${userId}.survivor.manualOverride`] = true;
            });

            await window.firebaseUtils.updateDoc(
                window.firebaseUtils.doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'),
                updates
            );

            this.showMessage(`Bulk operation completed for ${userCount} users`, 'success');
            this.hideBulkActionsModal();
            this.selectedUsers.clear();
            await this.refreshData();

        } catch (error) {
            console.error('Error in bulk operation:', error);
            this.showMessage('Error in bulk operation: ' + error.message, 'error');
        }
    }

    exportCSV() {
        // Use enhanced CSV export system
        if (window.SurvivorCsvExporter) {
            const csvExporter = new window.SurvivorCsvExporter(this.allUsers);
            csvExporter.showExportModal();
        } else {
            // Fallback to basic export if enhanced system not loaded
            const csvData = this.generateCSVData();
            this.downloadCSV(csvData, `survivor-data-${new Date().toISOString().split('T')[0]}.csv`);
            this.showMessage('CSV exported successfully', 'success');
        }
    }

    generateCSVData() {
        const headers = ['USER_ID', 'NAME', 'EMAIL', 'STATUS', 'ALIVE_WEEK', 'PICK_HISTORY', 'TOTAL_PICKS', 'LAST_UPDATED'];

        const rows = this.allUsers.map(user => [
            user.userId,
            `"${user.name}"`,
            `"${user.email}"`,
            user.statusText,
            user.alive,
            `"${user.pickHistory}"`,
            user.totalPicks,
            user.lastUpdated || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        const originalText = refreshBtn.innerHTML;

        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
        refreshBtn.disabled = true;

        try {
            await this.loadEmbeddedSurvivorData();
            this.renderUserTable();
            this.updateStatistics();
            this.showMessage('Data refreshed successfully', 'success');
        } catch (error) {
            this.showMessage('Error refreshing data: ' + error.message, 'error');
        }

        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }

    showUserEditModal() {
        document.getElementById('user-edit-modal').classList.add('show');
    }

    hideUserEditModal() {
        document.getElementById('user-edit-modal').classList.remove('show');
        this.currentEditUser = null;
    }

    showBulkActionsModal() {
        document.getElementById('selected-count').textContent = this.selectedUsers.size;
        document.getElementById('bulk-actions-modal').classList.add('show');
    }

    hideBulkActionsModal() {
        document.getElementById('bulk-actions-modal').classList.remove('show');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('show'));
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        const messageId = Date.now();

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const messageEl = document.createElement('div');
        messageEl.id = `message-${messageId}`;
        messageEl.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg mb-4 flex items-center transform translate-x-full transition-transform duration-300`;
        messageEl.innerHTML = `
            <i class="fas ${icons[type]} mr-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(messageEl);

        // Animate in
        setTimeout(() => {
            messageEl.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.classList.add('translate-x-full');
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.survivorAdmin = new EnhancedSurvivorAdmin();
});