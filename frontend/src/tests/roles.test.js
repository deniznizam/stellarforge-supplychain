const fs = require('fs');
const path = require('path');

test('Verify that Lender, Supplier, Buyer, and Validator simulation roles exist in page.tsx', () => {
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  expect(content).toContain('id: "Lender"');
  expect(content).toContain('id: "Supplier"');
  expect(content).toContain('id: "Buyer"');
  expect(content).toContain('id: "Validator"');
});
