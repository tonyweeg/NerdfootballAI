beforeAll(async () => {
  console.log('Starting browser tests...');
});

afterAll(async () => {
  console.log('Browser tests completed.');
});

beforeEach(async () => {
  await jestPuppeteer.resetBrowser();
});