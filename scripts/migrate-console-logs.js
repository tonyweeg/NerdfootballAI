#!/usr/bin/env node

/**
 * Console.log to Logger Migration Script
 *
 * Identifies and migrates console.log statements to use centralized logger.js
 * with proper categorization and log levels.
 *
 * Usage:
 *   node scripts/migrate-console-logs.js --analyze  (analyze only)
 *   node scripts/migrate-console-logs.js --migrate  (perform migration)
 *   node scripts/migrate-console-logs.js --migrate --dry-run  (test migration)
 */

const fs = require('fs');
const path = require('path');

// Console patterns to detect
const CONSOLE_LOG_PATTERN = /console\.(log|warn|error|info)\(/g;

// Category detection patterns (emoji-based)
const CATEGORY_PATTERNS = {
    AUTH: /🔐|auth|login|user|session/i,
    CACHE: /🔥|cache|caching|ttl|expir/i,
    PICKS: /🎯|pick|select|choice|confidence/i,
    SURVIVOR: /💀|survivor|eliminat|alive/i,
    CONFIDENCE: /🐝|confidence|killer.*bee/i,
    GRID: /🎲|grid|square|cell/i,
    LEADERBOARD: /🏆|leaderboard|ranking|score|point/i,
    AI: /🤖|ai|prediction|intelligen/i,
    ESPN: /📊|espn|api|fetch|endpoint/i,
    FIRESTORE: /📦|firestore|firebase|database|collection/i
};

class ConsoleLogMigrator {
    constructor(options = {}) {
        this.options = options;
        this.publicDir = path.join(__dirname, '..', 'public');
        this.results = {
            analyzed: 0,
            totalConsoleLogs: 0,
            consoleLogCount: 0,
            consoleWarnCount: 0,
            consoleErrorCount: 0,
            consoleInfoCount: 0,
            categorized: {},
            migrated: 0,
            errors: []
        };
        this.files = [];
    }

    /**
     * Analyze all HTML files for console statements
     */
    async analyze() {
        console.log('🔍 Analyzing files for console.log statements...\n');

        const htmlFiles = this.findHTMLFiles(this.publicDir);
        const jsFiles = this.findJSFiles(path.join(this.publicDir, 'js'));

        const allFiles = [...htmlFiles, ...jsFiles];

        for (const file of allFiles) {
            await this.analyzeFile(file);
        }

        this.printReport();
        return this.results;
    }

    /**
     * Find all HTML files recursively
     */
    findHTMLFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Skip node_modules and backups
                if (!file.includes('node_modules') && !file.includes('backups')) {
                    this.findHTMLFiles(filePath, fileList);
                }
            } else if (file.endsWith('.html')) {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    /**
     * Find all JS files recursively
     */
    findJSFiles(dir, fileList = []) {
        if (!fs.existsSync(dir)) return fileList;

        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!file.includes('node_modules')) {
                    this.findJSFiles(filePath, fileList);
                }
            } else if (file.endsWith('.js')) {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    /**
     * Analyze a single file
     */
    async analyzeFile(filePath) {
        this.results.analyzed++;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = content.match(CONSOLE_LOG_PATTERN) || [];

            if (matches.length > 0) {
                const logs = matches.filter(m => m.includes('log'));
                const warns = matches.filter(m => m.includes('warn'));
                const errors = matches.filter(m => m.includes('error'));
                const infos = matches.filter(m => m.includes('info'));

                this.results.totalConsoleLogs += matches.length;
                this.results.consoleLogCount += logs.length;
                this.results.consoleWarnCount += warns.length;
                this.results.consoleErrorCount += errors.length;
                this.results.consoleInfoCount += infos.length;

                const category = this.detectCategory(content);
                if (category) {
                    this.results.categorized[category] = (this.results.categorized[category] || 0) + matches.length;
                }

                this.files.push({
                    path: path.relative(this.publicDir, filePath),
                    fullPath: filePath,
                    count: matches.length,
                    category,
                    logs: logs.length,
                    warns: warns.length,
                    errors: errors.length,
                    infos: infos.length
                });
            }
        } catch (error) {
            this.results.errors.push({
                file: filePath,
                error: error.message
            });
        }
    }

    /**
     * Detect category based on file content
     */
    detectCategory(content) {
        for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
            if (pattern.test(content)) {
                return category;
            }
        }
        return 'UNKNOWN';
    }

    /**
     * Migrate files to use centralized logger
     */
    async migrate(dryRun = false) {
        console.log(`🚀 ${dryRun ? '[DRY RUN] ' : ''}Migrating console statements to logger.js...\n`);

        // First analyze
        await this.analyze();

        console.log(`\n📦 Found ${this.files.length} files with console statements\n`);

        for (const file of this.files) {
            await this.migrateFile(file, dryRun);
        }

        if (!dryRun) {
            console.log(`\n✅ Migration complete! ${this.results.migrated} files migrated.`);
        } else {
            console.log(`\n✅ Dry run complete! ${this.results.migrated} files would be migrated.`);
        }

        return this.results;
    }

    /**
     * Migrate a single file
     */
    async migrateFile(file, dryRun = false) {
        try {
            let content = fs.readFileSync(file.fullPath, 'utf8');
            let modified = false;

            // Check if file already has logger import/script
            const hasLoggerImport = content.includes('logger.js') || content.includes('window.logger');

            if (!hasLoggerImport) {
                // Add logger script tag for HTML files
                if (file.fullPath.endsWith('.html')) {
                    const scriptTag = `    <script src="./js/utils/logger.js"></script>\n</head>`;
                    if (content.includes('</head>')) {
                        content = content.replace('</head>', scriptTag);
                        modified = true;
                    }
                }
            }

            // Migrate console.log statements to logger
            const category = file.category || 'UNKNOWN';
            const categoryLower = category.toLowerCase();

            // Replace console.log
            content = content.replace(/console\.log\(/g, `logger.${categoryLower}(`);

            // Replace console.warn
            content = content.replace(/console\.warn\(/g, `logger.warn('${category}', `);

            // Replace console.error
            content = content.replace(/console\.error\(/g, `logger.error('${category}', `);

            // Replace console.info
            content = content.replace(/console\.info\(/g, `logger.info('${category}', `);

            if (!dryRun) {
                fs.writeFileSync(file.fullPath, content, 'utf8');
                console.log(`  ✅ ${file.path} (${file.count} statements, category: ${category})`);
            } else {
                console.log(`  📝 [DRY RUN] ${file.path} (${file.count} statements, category: ${category})`);
            }

            this.results.migrated++;
        } catch (error) {
            console.error(`  ❌ ${file.path}: ${error.message}`);
            this.results.errors.push({
                file: file.path,
                error: error.message
            });
        }
    }

    /**
     * Print analysis report
     */
    printReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 CONSOLE.LOG MIGRATION ANALYSIS REPORT');
        console.log('='.repeat(80) + '\n');

        console.log(`Total files analyzed: ${this.results.analyzed}`);
        console.log(`Files with console statements: ${this.files.length}`);
        console.log(`Total console statements: ${this.results.totalConsoleLogs}`);
        console.log(`  📝 console.log: ${this.results.consoleLogCount}`);
        console.log(`  ⚠️  console.warn: ${this.results.consoleWarnCount}`);
        console.log(`  ❌ console.error: ${this.results.consoleErrorCount}`);
        console.log(`  ℹ️  console.info: ${this.results.consoleInfoCount}`);

        if (Object.keys(this.results.categorized).length > 0) {
            console.log('\n📁 Statements by category:');
            Object.entries(this.results.categorized)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    console.log(`  ${category}: ${count}`);
                });
        }

        if (this.files.length > 0) {
            console.log('\n📄 Top files by console statement count:');
            this.files
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .forEach(file => {
                    console.log(`  ${file.path}: ${file.count} statements`);
                });
        }

        if (this.results.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            this.results.errors.forEach(error => {
                console.log(`  ❌ ${error.file}: ${error.error}`);
            });
        }

        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const dryRun = args.includes('--dry-run');

    const migrator = new ConsoleLogMigrator();

    if (command === '--analyze') {
        migrator.analyze();
    } else if (command === '--migrate') {
        migrator.migrate(dryRun);
    } else {
        console.log(`
Console.log Migration Script

Usage:
  node scripts/migrate-console-logs.js --analyze       Analyze files only
  node scripts/migrate-console-logs.js --migrate       Perform migration
  node scripts/migrate-console-logs.js --migrate --dry-run  Test migration

Examples:
  npm run analyze-console-logs   (analyze only)
  npm run migrate-console-logs   (perform migration)
        `);
    }
}

module.exports = ConsoleLogMigrator;
