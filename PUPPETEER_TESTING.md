# Puppeteer Browser Testing Guide

## Overview
This project uses Puppeteer for automated browser testing to ensure a top-notch user experience across all pages and features.

## Installation
```bash
npm install
```

## Running Tests

### Run all browser tests
```bash
npm run test:browser
```

### Run tests with visible browser (debugging)
```bash
npm run test:headful
```

### Run tests in debug mode (slow, with DevTools)
```bash
npm run test:debug
```

## Test Structure

```
tests/
├── homepage.test.js      # Homepage functionality tests
├── grid.test.js          # The Grid page tests
├── survivor.test.js      # Nerd Survivor page tests
├── performance.test.js   # Performance and optimization tests
├── setup.js             # Test environment setup
└── utils/
    └── test-helpers.js  # Reusable test utilities
```

## Test Coverage

### Homepage Tests
- Page loading and navigation
- Console error checking
- Responsive design verification
- Accessibility compliance
- Page load performance
- Screenshot capture

### Grid Tests
- Grid layout rendering
- Interactive elements functionality
- Data loading verification
- Mobile responsiveness
- User interaction handling

### Survivor Tests
- Schedule data display
- Team selection functionality
- JSON data loading
- Week navigation
- Matchup display
- Mobile optimization

### Performance Tests
- Memory usage monitoring
- Page load metrics (FCP, DOM Content Loaded)
- Resource loading efficiency
- Image optimization checks
- Memory leak detection during navigation

## Test Utilities

The `TestHelpers` class provides reusable methods:
- `navigateToPage()` - Navigate to specific pages
- `takeScreenshot()` - Capture screenshots for visual regression
- `waitForElement()` - Wait for elements to appear
- `clickElement()` - Click interactive elements
- `checkResponsiveness()` - Test across different viewports
- `checkAccessibility()` - Basic accessibility checks
- `measurePageLoadTime()` - Performance measurement

## CI/CD Integration

Tests run automatically on:
- Push to main or develop branches
- Pull requests to main branch

Failed test screenshots are automatically uploaded as artifacts.

## Local Development Server

Tests automatically start a Python HTTP server on port 8080 to serve the public directory.

## Debugging Tips

1. Use `npm run test:debug` to see the browser and slow down actions
2. Screenshots are saved to `screenshots/` directory
3. Add `await page.waitForTimeout(5000)` to pause execution
4. Use `console.log()` in tests to output debugging information
5. Check `page.on('console')` to capture browser console messages

## Best Practices

1. Always wait for elements before interacting
2. Use data attributes for test selectors when possible
3. Keep tests independent and idempotent
4. Clean up resources in `afterEach` hooks
5. Use meaningful test descriptions
6. Group related tests in describe blocks
7. Mock external APIs when appropriate
8. Test both happy paths and error cases

## Extending Tests

To add new tests:
1. Create a new test file in `tests/` directory
2. Import TestHelpers for common utilities
3. Write descriptive test cases
4. Run locally before committing
5. Ensure CI passes before merging

## Troubleshooting

### Tests timing out
- Increase timeout in jest.puppeteer.config.js
- Check if server is running properly
- Verify network conditions

### Screenshot failures
- Ensure screenshots directory exists
- Check file permissions
- Verify disk space

### CI failures
- Check GitHub Actions logs
- Download artifact screenshots
- Run tests locally with same Node version