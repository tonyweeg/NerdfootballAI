#!/bin/bash

# Local Firebase Emulator Testing Environment
# Complete setup and testing automation for multi-entry functionality

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/tonyweeg/nerdfootball-project"
EMULATOR_UI_PORT=4001
HOSTING_PORT=5002

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI is not installed"
        log_info "Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check required Node modules
    if [ ! -d "node_modules" ]; then
        log_warning "Node modules not found. Installing..."
        npm install
    fi
    
    log_success "Dependencies check completed"
}

kill_existing_processes() {
    log_info "Cleaning up existing processes..."
    
    # Kill any existing firebase processes
    pkill -f "firebase emulators:start" || true
    pkill -f "firebase serve" || true
    
    # Wait a moment for processes to clean up
    sleep 2
    
    log_success "Process cleanup completed"
}

start_emulators() {
    log_info "Starting Firebase emulators..."
    
    # Start emulators in background
    firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data &
    EMULATOR_PID=$!
    
    # Wait for emulators to start
    log_info "Waiting for emulators to initialize..."
    sleep 10
    
    # Check if emulators are running
    if ! curl -s http://localhost:$EMULATOR_UI_PORT > /dev/null; then
        log_error "Emulators failed to start"
        exit 1
    fi
    
    log_success "Emulators started successfully"
    log_info "Emulator UI: http://localhost:$EMULATOR_UI_PORT"
    log_info "App URL: http://localhost:$HOSTING_PORT"
}

setup_test_data() {
    log_info "Setting up test data..."
    
    # Import base test data
    node local-data-import.js reset
    
    # Set up multi-entry feature flags and additional test data
    node local-feature-flags.js full-setup
    
    log_success "Test data setup completed"
}

run_tests() {
    log_info "Running automated test suite..."
    
    # Run the multi-entry test suite
    node test-multi-entry-local.js
    
    log_success "Automated tests completed"
}

show_testing_guide() {
    echo ""
    echo "===========================================" 
    echo "🧪 MULTI-ENTRY LOCAL TESTING ENVIRONMENT"
    echo "==========================================="
    echo ""
    echo "📍 Test URLs:"
    echo "   - App: http://localhost:$HOSTING_PORT"
    echo "   - Emulator UI: http://localhost:$EMULATOR_UI_PORT"
    echo ""
    echo "👤 Test Users:"
    echo "   - tony@test.com (Multi-entry + Admin powers)"
    echo "   - mike@test.com (Single entry user)"
    echo "   - sarah@test.com (Standard user)"
    echo "   Password: testpassword (or any password in emulator)"
    echo ""
    echo "🧪 Manual Testing Scenarios:"
    echo "   1. Sign in as tony@test.com"
    echo "      - Verify entry selector appears"
    echo "      - Test switching between entries"
    echo "      - Test renaming entries"
    echo "      - Test admin entry creation"
    echo ""
    echo "   2. Sign in as mike@test.com"
    echo "      - Verify NO entry selector"
    echo "      - Confirm single-entry behavior"
    echo "      - Test backward compatibility"
    echo ""
    echo "🛠️  Feature Flag Controls:"
    echo "   node local-feature-flags.js list"
    echo "   node local-feature-flags.js enable multi-entry-survivor"
    echo "   node local-feature-flags.js disable multi-entry-survivor"
    echo ""
    echo "📊 Data Management:"
    echo "   node local-data-import.js reset  # Reset all data"
    echo "   node local-feature-flags.js full-setup  # Setup multi-entry"
    echo ""
    echo "🔄 To restart environment:"
    echo "   $0 restart"
    echo ""
    echo "⏹️  To stop:"
    echo "   $0 stop"
    echo ""
}

stop_environment() {
    log_info "Stopping local testing environment..."
    
    kill_existing_processes
    
    log_success "Environment stopped"
}

# Main command handling
case "${1:-start}" in
    "start")
        log_info "🚀 Starting local multi-entry testing environment..."
        check_dependencies
        kill_existing_processes
        start_emulators
        setup_test_data
        show_testing_guide
        ;;
    
    "stop")
        stop_environment
        ;;
    
    "restart") 
        stop_environment
        sleep 3
        $0 start
        ;;
    
    "test")
        log_info "Running automated tests only..."
        run_tests
        ;;
    
    "setup-data")
        log_info "Setting up test data only..."
        setup_test_data
        ;;
    
    "reset")
        log_info "Resetting test environment..."
        setup_test_data
        log_success "Test environment reset completed"
        ;;
    
    "help"|"-h"|"--help")
        echo "Local Multi-Entry Testing Environment"
        echo ""
        echo "Commands:"
        echo "  start       - Start complete testing environment (default)"
        echo "  stop        - Stop all emulator processes"
        echo "  restart     - Stop and restart environment"  
        echo "  test        - Run automated test suite"
        echo "  setup-data  - Setup/reset test data only"
        echo "  reset       - Reset test data and feature flags"
        echo "  help        - Show this help"
        ;;
    
    *)
        log_error "Unknown command: $1"
        echo "Run '$0 help' for available commands"
        exit 1
        ;;
esac