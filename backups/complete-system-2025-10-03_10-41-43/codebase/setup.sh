#!/bin/bash

echo "Checking Python setup..."

# Check for various Python installations
if command -v python3 &> /dev/null; then
    echo "✓ python3 found: $(python3 --version)"
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
elif command -v python &> /dev/null; then
    echo "✓ python found: $(python --version)"
    PYTHON_CMD="python"
    PIP_CMD="pip"
else
    echo "✗ No Python found"
    
    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo "✓ Homebrew found, installing Python..."
        brew install python
        PYTHON_CMD="python3"
        PIP_CMD="pip3"
    else
        echo "Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install python
        PYTHON_CMD="python3"
        PIP_CMD="pip3"
    fi
fi

# Check pip
if command -v $PIP_CMD &> /dev/null; then
    echo "✓ $PIP_CMD found: $($PIP_CMD --version)"
else
    echo "Installing pip..."
    $PYTHON_CMD -m ensurepip --upgrade
fi

echo ""
echo "Installing required packages..."
$PIP_CMD install requests beautifulsoup4 lxml

echo ""
echo "Running tests..."
$PYTHON_CMD test_scraper.py

echo ""
echo "Setup complete! To run the scraper:"
echo "  $PYTHON_CMD nfl_team_scraper.py"
