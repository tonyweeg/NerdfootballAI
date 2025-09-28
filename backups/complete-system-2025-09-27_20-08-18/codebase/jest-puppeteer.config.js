module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.DEBUG === 'true' ? 100 : 0,
    devtools: process.env.DEBUG === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  },
  server: {
    command: 'python3 -m http.server 8080 -d public',
    port: 8080,
    launchTimeout: 10000,
    debug: true
  }
};