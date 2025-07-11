// Test the isCustomTaskId function directly
function isCustomTaskId(taskId) {
  console.log(`\n=== Testing taskId: "${taskId}" ===`);

  if (!taskId || typeof taskId !== 'string') {
    console.log('❌ Failed: taskId is not a valid string');
    return false;
  }

  // Trim whitespace
  taskId = taskId.trim();
  console.log(`✓ Trimmed taskId: "${taskId}"`);

  // Check if it's a standard 9-character ClickUp ID (letters and numbers only)
  const standardIdPattern = /^[a-zA-Z0-9]{9}$/;
  if (standardIdPattern.test(taskId)) {
    console.log('❌ Detected as standard 9-character ClickUp ID');
    return false;
  }
  console.log('✓ Not a standard 9-character ClickUp ID');

  // Check for common custom task ID patterns:
  // 1. Contains hyphens (most common pattern: PREFIX-NUMBER)
  if (taskId.includes('-')) {
    console.log('✓ Contains hyphen, checking pattern...');
    // Additional validation: should have letters before hyphen and numbers after
    const hyphenPattern = /^[A-Za-z]+[-][0-9]+$/;
    const matches = hyphenPattern.test(taskId);
    console.log(`Pattern /^[A-Za-z]+[-][0-9]+$/ matches: ${matches}`);
    return matches;
  }

  // 2. Contains underscores (another common pattern: PREFIX_NUMBER)
  if (taskId.includes('_')) {
    console.log('✓ Contains underscore, checking pattern...');
    const underscorePattern = /^[A-Za-z]+[_][0-9]+$/;
    const matches = underscorePattern.test(taskId);
    console.log(`Pattern /^[A-Za-z]+[_][0-9]+$/ matches: ${matches}`);
    return matches;
  }

  // 3. Contains uppercase letters followed by numbers (without separators)
  const customIdPattern = /^[A-Z]+\d+$/;
  if (customIdPattern.test(taskId)) {
    console.log('✓ Matches uppercase letters + numbers pattern');
    return true;
  }

  // 4. Mixed case with numbers but not 9 characters (less common)
  const mixedCasePattern = /^[A-Za-z]+\d+$/;
  if (mixedCasePattern.test(taskId) && taskId.length !== 9) {
    console.log('✓ Matches mixed case + numbers pattern (not 9 chars)');
    return true;
  }

  // 5. Contains dots (some organizations use PROJECT.TASK format)
  if (taskId.includes('.')) {
    console.log('✓ Contains dot, checking pattern...');
    const dotPattern = /^[A-Za-z]+[.][0-9]+$/;
    const matches = dotPattern.test(taskId);
    console.log(`Pattern /^[A-Za-z]+[.][0-9]+$/ matches: ${matches}`);
    return matches;
  }

  // If none of the patterns match, assume it's a regular task ID
  console.log('❌ No custom task ID patterns matched');
  return false;
}

console.log('='.repeat(60));
console.log('TESTING CUSTOM TASK ID DETECTION');
console.log('='.repeat(60));

const testCases = [
  'DEV-2427',
  'DEV-1234',
  '86b5nfhay',
  'ABC_123',
  'PROJECT.456',
  'PROJ123',
  'test-123'
];

testCases.forEach(testCase => {
  const result = isCustomTaskId(testCase);
  console.log(`\n🔍 RESULT for "${testCase}": ${result ? '✅ CUSTOM ID' : '❌ REGULAR ID'}`);
});
