/**
 * 🎯 ENHANCED CSV EXPORT SYSTEM
 *
 * Provides multiple CSV export formats for comprehensive survivor data analysis
 */

class SurvivorCSVExporter {
    constructor(survivorAdmin) {
        this.admin = survivorAdmin;
        this.init();
    }

    init() {
        // Replace the simple CSV export with enhanced modal
        this.createExportModal();
        this.setupEventListeners();
    }

    createExportModal() {
        const modalHTML = `
            <div id="csv-export-modal" class="modal">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-download mr-2"></i>
                            Enhanced CSV Export
                        </h3>
                    </div>

                    <div class="px-6 py-4 space-y-6">
                        <!-- Export Type Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                            <div class="grid grid-cols-1 gap-3">
                                <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="export-format" value="standard" checked class="text-blue-600 focus:ring-blue-500">
                                    <div>
                                        <div class="font-medium text-gray-900">Standard Export</div>
                                        <div class="text-sm text-gray-500">All users with basic survivor data</div>
                                    </div>
                                </label>

                                <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="export-format" value="detailed" class="text-blue-600 focus:ring-blue-500">
                                    <div>
                                        <div class="font-medium text-gray-900">Detailed Analysis</div>
                                        <div class="text-sm text-gray-500">Includes pick timeline and elimination analysis</div>
                                    </div>
                                </label>

                                <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="export-format" value="pick-analysis" class="text-blue-600 focus:ring-blue-500">
                                    <div>
                                        <div class="font-medium text-gray-900">Pick Popularity Analysis</div>
                                        <div class="text-sm text-gray-500">Team popularity and win rates by week</div>
                                    </div>
                                </label>

                                <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="radio" name="export-format" value="weekly-summary" class="text-blue-600 focus:ring-blue-500">
                                    <div>
                                        <div class="font-medium text-gray-900">Weekly Summary</div>
                                        <div class="text-sm text-gray-500">Elimination statistics by week</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- User Filter -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">User Filter</label>
                            <select id="export-user-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="all">All Users</option>
                                <option value="alive">Alive Users Only</option>
                                <option value="eliminated">Eliminated Users Only</option>
                                <option value="selected">Selected Users Only</option>
                            </select>
                        </div>

                        <!-- Week Range -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Week Range</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">From Week</label>
                                    <select id="export-week-start" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="1">Week 1</option>
                                        <option value="2">Week 2</option>
                                        <option value="3">Week 3</option>
                                        <option value="4">Week 4</option>
                                        <option value="5">Week 5</option>
                                        <option value="6">Week 6</option>
                                        <option value="7">Week 7</option>
                                        <option value="8">Week 8</option>
                                        <option value="9">Week 9</option>
                                        <option value="10">Week 10</option>
                                        <option value="11">Week 11</option>
                                        <option value="12">Week 12</option>
                                        <option value="13">Week 13</option>
                                        <option value="14">Week 14</option>
                                        <option value="15">Week 15</option>
                                        <option value="16">Week 16</option>
                                        <option value="17">Week 17</option>
                                        <option value="18">Week 18</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">To Week</label>
                                    <select id="export-week-end" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="1">Week 1</option>
                                        <option value="2" selected>Week 2</option>
                                        <option value="3">Week 3</option>
                                        <option value="4">Week 4</option>
                                        <option value="5">Week 5</option>
                                        <option value="6">Week 6</option>
                                        <option value="7">Week 7</option>
                                        <option value="8">Week 8</option>
                                        <option value="9">Week 9</option>
                                        <option value="10">Week 10</option>
                                        <option value="11">Week 11</option>
                                        <option value="12">Week 12</option>
                                        <option value="13">Week 13</option>
                                        <option value="14">Week 14</option>
                                        <option value="15">Week 15</option>
                                        <option value="16">Week 16</option>
                                        <option value="17">Week 17</option>
                                        <option value="18">Week 18</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Preview -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Export Preview</label>
                            <div id="export-preview" class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                                <div class="text-gray-500">Select export options to see preview...</div>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                        <button id="cancel-csv-export" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <div class="flex space-x-3">
                            <button id="preview-csv" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-eye mr-2"></i>Preview
                            </button>
                            <button id="download-csv" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-download mr-2"></i>Download CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        // Replace original CSV button functionality
        const csvBtn = document.getElementById('csv-export-btn');
        csvBtn.onclick = () => this.showExportModal();

        // Modal controls
        document.getElementById('cancel-csv-export').addEventListener('click', () => this.hideExportModal());
        document.getElementById('preview-csv').addEventListener('click', () => this.previewCSV());
        document.getElementById('download-csv').addEventListener('click', () => this.downloadCSV());

        // Auto-preview on option change
        ['export-format', 'export-user-filter', 'export-week-start', 'export-week-end'].forEach(id => {
            const element = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
            if (element) {
                element.addEventListener('change', () => this.previewCSV());
            }
        });

        // Radio button listeners
        document.querySelectorAll('[name="export-format"]').forEach(radio => {
            radio.addEventListener('change', () => this.previewCSV());
        });
    }

    showExportModal() {
        document.getElementById('csv-export-modal').classList.add('show');
        this.previewCSV();
    }

    hideExportModal() {
        document.getElementById('csv-export-modal').classList.remove('show');
    }

    getExportOptions() {
        return {
            format: document.querySelector('[name="export-format"]:checked').value,
            userFilter: document.getElementById('export-user-filter').value,
            weekStart: parseInt(document.getElementById('export-week-start').value),
            weekEnd: parseInt(document.getElementById('export-week-end').value)
        };
    }

    getFilteredUsers(options) {
        let users = this.admin.allUsers;

        switch (options.userFilter) {
            case 'alive':
                users = users.filter(u => u.status === 'alive');
                break;
            case 'eliminated':
                users = users.filter(u => u.status === 'eliminated');
                break;
            case 'selected':
                users = users.filter(u => this.admin.selectedUsers.has(u.userId));
                break;
        }

        return users;
    }

    generateStandardCSV(users, options) {
        const headers = ['USER_ID', 'NAME', 'EMAIL', 'STATUS', 'ALIVE_WEEK', 'PICK_HISTORY', 'TOTAL_PICKS', 'LAST_UPDATED'];

        const rows = users.map(user => [
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

    generateDetailedCSV(users, options) {
        const headers = ['USER_ID', 'NAME', 'EMAIL', 'STATUS', 'ALIVE_WEEK', 'ELIMINATION_WEEK', 'TOTAL_PICKS', 'PICK_HISTORY', 'MANUAL_OVERRIDE', 'LAST_UPDATED'];

        const rows = users.map(user => {
            const picks = user.pickHistory.split(', ').filter(p => p.trim());
            const eliminationWeek = user.status === 'eliminated' ? user.alive : 'N/A';

            return [
                user.userId,
                `"${user.name}"`,
                `"${user.email}"`,
                user.statusText,
                user.alive,
                eliminationWeek,
                user.totalPicks,
                `"${user.pickHistory}"`,
                user.manualOverride ? 'Yes' : 'No',
                user.lastUpdated || ''
            ];
        });

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generatePickAnalysisCSV(users, options) {
        const pickStats = {};

        // Analyze picks by week
        users.forEach(user => {
            const picks = user.pickHistory.split(', ').filter(p => p.trim());
            picks.forEach((team, index) => {
                const week = index + 1;
                if (week >= options.weekStart && week <= options.weekEnd) {
                    const key = `${week}-${team}`;
                    if (!pickStats[key]) {
                        pickStats[key] = {
                            week,
                            team,
                            pickCount: 0,
                            aliveAfter: 0
                        };
                    }
                    pickStats[key].pickCount++;
                    if (user.alive > week || user.alive === 18) {
                        pickStats[key].aliveAfter++;
                    }
                }
            });
        });

        const headers = ['WEEK', 'TEAM', 'PICK_COUNT', 'SURVIVED_COUNT', 'SURVIVAL_RATE'];

        const rows = Object.values(pickStats)
            .sort((a, b) => a.week - b.week || a.team.localeCompare(b.team))
            .map(stat => [
                stat.week,
                `"${stat.team}"`,
                stat.pickCount,
                stat.aliveAfter,
                `${Math.round((stat.aliveAfter / stat.pickCount) * 100)}%`
            ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateWeeklySummaryCSV(users, options) {
        const weeklyStats = {};

        // Initialize weeks
        for (let week = options.weekStart; week <= options.weekEnd; week++) {
            weeklyStats[week] = {
                week,
                totalPickers: 0,
                survivors: 0,
                eliminated: 0,
                eliminationRate: 0
            };
        }

        // Calculate stats
        users.forEach(user => {
            const picks = user.pickHistory.split(', ').filter(p => p.trim());
            picks.forEach((team, index) => {
                const week = index + 1;
                if (weeklyStats[week]) {
                    weeklyStats[week].totalPickers++;
                    if (user.alive > week || user.alive === 18) {
                        weeklyStats[week].survivors++;
                    } else if (user.alive === week) {
                        weeklyStats[week].eliminated++;
                    }
                }
            });
        });

        // Calculate elimination rates
        Object.values(weeklyStats).forEach(stat => {
            if (stat.totalPickers > 0) {
                stat.eliminationRate = Math.round((stat.eliminated / stat.totalPickers) * 100);
            }
        });

        const headers = ['WEEK', 'TOTAL_PICKERS', 'SURVIVORS', 'ELIMINATED', 'ELIMINATION_RATE'];

        const rows = Object.values(weeklyStats).map(stat => [
            stat.week,
            stat.totalPickers,
            stat.survivors,
            stat.eliminated,
            `${stat.eliminationRate}%`
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateCSV(options) {
        const users = this.getFilteredUsers(options);

        switch (options.format) {
            case 'standard':
                return this.generateStandardCSV(users, options);
            case 'detailed':
                return this.generateDetailedCSV(users, options);
            case 'pick-analysis':
                return this.generatePickAnalysisCSV(users, options);
            case 'weekly-summary':
                return this.generateWeeklySummaryCSV(users, options);
            default:
                return this.generateStandardCSV(users, options);
        }
    }

    previewCSV() {
        try {
            const options = this.getExportOptions();
            const csvContent = this.generateCSV(options);
            const lines = csvContent.split('\n');
            const preview = lines.slice(0, 6).join('\n') + (lines.length > 6 ? '\n...' : '');

            document.getElementById('export-preview').innerHTML = `
                <div class="text-green-600 text-xs mb-2">
                    ✓ ${lines.length - 1} rows generated
                </div>
                <pre class="whitespace-pre-wrap">${preview}</pre>
            `;
        } catch (error) {
            document.getElementById('export-preview').innerHTML = `
                <div class="text-red-600">Error generating preview: ${error.message}</div>
            `;
        }
    }

    downloadCSV() {
        try {
            const options = this.getExportOptions();
            const csvContent = this.generateCSV(options);
            const filename = this.generateFilename(options);

            this.downloadFile(csvContent, filename);
            this.admin.showMessage(`CSV exported: ${filename}`, 'success');
            this.hideExportModal();

        } catch (error) {
            this.admin.showMessage('Error generating CSV: ' + error.message, 'error');
        }
    }

    generateFilename(options) {
        const date = new Date().toISOString().split('T')[0];
        const formatNames = {
            'standard': 'standard',
            'detailed': 'detailed',
            'pick-analysis': 'pick-analysis',
            'weekly-summary': 'weekly-summary'
        };

        return `survivor-${formatNames[options.format]}-${options.userFilter}-weeks${options.weekStart}-${options.weekEnd}-${date}.csv`;
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
}

// Initialize enhanced CSV exporter when admin is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for admin to be initialized
    const initCSVExporter = () => {
        if (window.survivorAdmin) {
            window.csvExporter = new SurvivorCSVExporter(window.survivorAdmin);
        } else {
            setTimeout(initCSVExporter, 100);
        }
    };
    initCSVExporter();
});