const fs = require('fs');
const path = require('path');

test('Verify that initial project SF-001 through SF-004 are correctly declared in page.tsx', () => {
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  expect(content).toContain('id: "SF-001"');
  expect(content).toContain('id: "SF-002"');
  expect(content).toContain('id: "SF-003"');
  expect(content).toContain('id: "SF-004"');
});
