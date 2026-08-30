const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Setup minimal DOM mock
global.document = {
  addEventListener: () => {},
  querySelectorAll: () => [],
  querySelector: () => null
};
global.window = {
  location: { pathname: '' }
};

// Load the script
const scriptContent = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
eval(scriptContent);

test('formatWhatsAppNumber', async (t) => {
  await t.test('keeps only digits and plus sign', () => {
    assert.strictEqual(formatWhatsAppNumber('+62 812-3456-7890'), '+6281234567890');
  });

  await t.test('removes spaces, dashes, and parentheses', () => {
    assert.strictEqual(formatWhatsAppNumber('+1 (555) 123-4567'), '+15551234567');
  });

  await t.test('handles numbers without plus sign', () => {
    assert.strictEqual(formatWhatsAppNumber('0812-3456-7890'), '081234567890');
  });

  await t.test('removes letters and special characters', () => {
    assert.strictEqual(formatWhatsAppNumber('Phone: +62 812! @#34'), '+6281234');
  });

  await t.test('handles empty string', () => {
    assert.strictEqual(formatWhatsAppNumber(''), '');
  });
});
