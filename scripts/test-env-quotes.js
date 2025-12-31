
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Create a test .env file with quoted values
const envContent = `
TEST_VAR_UNQUOTED=value
TEST_VAR_QUOTED="value"
TEST_VAR_SINGLE_QUOTED='value'
TEST_URL="https://example.com/api?param=1"
`;

const testEnvPath = path.join(__dirname, '.env.test');
fs.writeFileSync(testEnvPath, envContent);

// Load with dotenv
const result = dotenv.config({ path: testEnvPath });

console.log('--- Dotenv Loading Result ---');
if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('TEST_VAR_UNQUOTED:', process.env.TEST_VAR_UNQUOTED);
    console.log('TEST_VAR_QUOTED:', process.env.TEST_VAR_QUOTED);
    console.log('TEST_VAR_SINGLE_QUOTED:', process.env.TEST_VAR_SINGLE_QUOTED);
    console.log('TEST_URL:', process.env.TEST_URL);

    // Check for retained quotes
    if (process.env.TEST_VAR_QUOTED === '"value"') {
        console.log('FAIL: Quotes were retained in value');
    } else if (process.env.TEST_VAR_QUOTED === 'value') {
        console.log('PASS: Quotes were stripped correctly');
    } else {
        console.log('UNKNOWN: Unexpected value:', process.env.TEST_VAR_QUOTED);
    }
}

// Cleanup
fs.unlinkSync(testEnvPath);
