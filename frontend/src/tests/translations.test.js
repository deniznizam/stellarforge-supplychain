const fs = require('fs');
const path = require('path');

test('Verify TR and EN translation dictionary keys are completely consistent', () => {
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  const trMatch = content.match(/tr:\s*\{([\s\S]*?)\n\s*\}/);
  const enMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\}/);

  expect(trMatch).not.toBeNull();
  expect(enMatch).not.toBeNull();

  if (trMatch && enMatch) {
    const trKeys = trMatch[1]
      .split('\n')
      .map(line => line.split(':')[0].trim())
      .filter(k => k && !k.startsWith('//') && !k.startsWith('/*'));
      
    const enKeys = enMatch[1]
      .split('\n')
      .map(line => line.split(':')[0].trim())
      .filter(k => k && !k.startsWith('//') && !k.startsWith('/*'));

    expect(trKeys.length).toBe(enKeys.length);

    const missingInEn = trKeys.filter(k => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
  }
});
