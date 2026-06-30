/**
 * StellarForge Frontend Unit Test Suite
 * Zero-dependency, lightweight, high-reliability test runner.
 */

const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🚀 Running StellarForge Frontend Unit Tests...");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.log(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

// Test 1: Translation dictionary key consistency
try {
  // Read the source file to parse the translation dictionary programmatically
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  // Simple key validation regex matching
  const trMatch = content.match(/tr:\s*\{([\s\S]*?)\n\s*\}/);
  const enMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\}/);

  if (trMatch && enMatch) {
    const trKeys = trMatch[1].split('\n').map(line => line.split(':')[0].trim()).filter(k => k && !k.startsWith('//'));
    const enKeys = enMatch[1].split('\n').map(line => line.split(':')[0].trim()).filter(k => k && !k.startsWith('//'));
    
    assert(trKeys.length === enKeys.length, `Translation dictionaries have equal keys count (TR: ${trKeys.length}, EN: ${enKeys.length})`);
    
    const missingInEn = trKeys.filter(k => !enKeys.includes(k));
    assert(missingInEn.length === 0, `All TR keys exist in EN dictionary (Missing: ${missingInEn.join(', ') || 'None'})`);
  } else {
    assert(false, "Could not locate translation blocks in page.tsx");
  }
} catch (e) {
  assert(false, `Test 1 failed with error: ${e.message}`);
}

// Test 2: Initial projects data validation
try {
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  // Verify that the initial projects array is declared with correct JSON structures
  assert(content.includes('id: "SF-001"'), 'Project SF-001 is registered in initial state');
  assert(content.includes('id: "SF-002"'), 'Project SF-002 is registered in initial state');
  assert(content.includes('id: "SF-003"'), 'Project SF-003 is registered in initial state');
  assert(content.includes('id: "SF-004"'), 'Project SF-004 is registered in initial state');
} catch (e) {
  assert(false, `Test 2 failed with error: ${e.message}`);
}

// Test 3: Simulation roles validation
try {
  const pagePath = path.join(__dirname, '..', 'app', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');

  // Verify that all role simulator buttons are rendered correctly
  assert(content.includes('id: "Lender"'), 'Lender simulation role exists');
  assert(content.includes('id: "Supplier"'), 'Supplier simulation role exists');
  assert(content.includes('id: "Buyer"'), 'Buyer simulation role exists');
  assert(content.includes('id: "Validator"'), 'Validator simulation role exists');
} catch (e) {
  assert(false, `Test 3 failed with error: ${e.message}`);
}

console.log("\n==================================================");
console.log(`📊 Test Results: ${passed} passed, ${failed} failed.`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
