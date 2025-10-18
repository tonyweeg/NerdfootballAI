#!/usr/bin/env node

/**
 * Firebase Config Migration Script
 *
 * Identifies and migrates duplicate Firebase configuration objects
 * to use centralized configuration files.
 *
 * Usage:
 *   node scripts/migrate-firebase-config.js --analyze  (analyze only)
 *   node scripts/migrate-firebase-config.js --migrate  (perform migration)
 *   node scripts/migrate-firebase-config.js --migrate --dry-run  (test migration)
 */

const fs = require('fs');
const path = require('path');

// Configuration patterns to detect
const FIREBASE_CONFIG_PATTERN = /const\s+firebaseConfig\s*=\s*\{[\s\S]*?\};/g;
const FIREBASE_INIT_PATTERN = /firebase\.initializeApp\(firebaseConfig\)/g;

// Correct Firebase config values for verification
const CORRECT_CONFIG = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac",
    projectId: "nerdfootball"
};

// Wrong config values to flag as critical
const WRONG_CONFIG = {
    apiKey: "AIzaSyC9bJIbGGTlwE21BDV1ihV6q3qQzm3Vpo8",
    messagingSenderId: "631080493141",
    appId: "1:631080493141:web:e7c5dde9013b0b4b60fe49"
};

class FirebaseConfigMigrator {
    constructor(options = {}) {
        this.options = options;
        this.publicDir = path.join(__dirname, '..', 'public');
        this.results = {
            analyzed: 0,
            withConfig: 0,
            correctConfig: 0,
            wrongConfig: 0,
            migrated: 0,
            errors: []
        };
        this.files = [];
    }

    /**
     * Analyze all HTML files in public directory
     */
    async analyze() {
        console.log('🔍 Analyzing HTML files for Firebase configurations...\n');

        const htmlFiles = this.findHTMLFiles(this.publicDir);

        for (const file of htmlFiles) {
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
     * Analyze a single file
     */
    async analyzeFile(filePath) {
        this.results.analyzed++;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const hasConfig = FIREBASE_CONFIG_PATTERN.test(content);

            if (hasConfig) {
                this.results.withConfig++;

                const configMatch = content.match(FIREBASE_CONFIG_PATTERN);
                const isCorrect = this.verifyConfig(configMatch[0], CORRECT_CONFIG);
                const isWrong = this.verifyConfig(configMatch[0], WRONG_CONFIG);

                if (isWrong) {
                    this.results.wrongConfig++;
                } else if (isCorrect) {
                    this.results.correctConfig++;
                }

                this.files.push({
                    path: path.relative(this.publicDir, filePath),
                    hasConfig: true,
                    isCorrect,
                    isWrong,
                    fullPath: filePath
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
     * Verify if config matches expected values
     */
    verifyConfig(configString, expectedConfig) {
        return Object.entries(expectedConfig).every(([key, value]) => {
            const regex = new RegExp(`${key}\\s*:\\s*["']${value}["']`);
            return regex.test(configString);
        });
    }

    /**
     * Migrate files to use centralized configuration
     */
    async migrate(dryRun = false) {
        console.log(`🚀 ${dryRun ? '[DRY RUN] ' : ''}Migrating Firebase configurations...\n`);

        // First analyze
        await this.analyze();

        const filesToMigrate = this.files.filter(f => f.hasConfig && !f.isWrong);

        console.log(`\n📦 Found ${filesToMigrate.length} files to migrate\n`);

        for (const file of filesToMigrate) {
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

            // Replace Firebase config declaration with centralized import
            const newConfigSection = `
    <!-- Firebase Config - Centralized -->
    <script src="./js/config/firebase-config-compat.js"></script>
    <script>
        const firebaseConfig = window.getFirebaseConfig();
    </script>`;

            // Remove old config block
            content = content.replace(FIREBASE_CONFIG_PATTERN, newConfigSection);

            if (!dryRun) {
                fs.writeFileSync(file.fullPath, content, 'utf8');
                console.log(`  ✅ ${file.path}`);
            } else {
                console.log(`  📝 [DRY RUN] ${file.path}`);
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
        console.log('📊 FIREBASE CONFIGURATION ANALYSIS REPORT');
        console.log('='.repeat(80) + '\n');

        console.log(`Total HTML files analyzed: ${this.results.analyzed}`);
        console.log(`Files with Firebase config: ${this.results.withConfig}`);
        console.log(`  ✅ Correct configurations: ${this.results.correctConfig}`);
        console.log(`  ⚠️  Wrong configurations: ${this.results.wrongConfig} (CRITICAL!)`);
        console.log(`  📦 Ready for migration: ${this.results.correctConfig}`);

        if (this.results.wrongConfig > 0) {
            console.log('\n🚨 CRITICAL: Files with WRONG configuration:');
            const wrongFiles = this.files.filter(f => f.isWrong);
            wrongFiles.forEach(file => {
                console.log(`  ❌ ${file.path}`);
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

    const migrator = new FirebaseConfigMigrator();

    if (command === '--analyze') {
        migrator.analyze();
    } else if (command === '--migrate') {
        migrator.migrate(dryRun);
    } else {
        console.log(`
Firebase Config Migration Script

Usage:
  node scripts/migrate-firebase-config.js --analyze       Analyze files only
  node scripts/migrate-firebase-config.js --migrate       Perform migration
  node scripts/migrate-firebase-config.js --migrate --dry-run  Test migration

Examples:
  npm run analyze-firebase-config   (analyze only)
  npm run migrate-firebase-config   (perform migration)
        `);
    }
}

module.exports = FirebaseConfigMigrator;
