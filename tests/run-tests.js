#!/usr/bin/env node

/**
 * Google Ads Conversion Node - Test Runner
 * 
 * This script performs basic validation tests on the node implementation
 * without requiring a full n8n environment setup.
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadTestData() {
    try {
        const testDataPath = path.join(__dirname, 'test-data.json');
        const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
        return testData;
    } catch (error) {
        log(`Error loading test data: ${error.message}`, 'red');
        process.exit(1);
    }
}

function validateNodeStructure() {
    log('\n🔍 Validating Node Structure...', 'blue');
    
    const nodePath = path.join(__dirname, '..', 'nodes', 'GoogleAdsConversion', 'GoogleAdsConversion.node.ts');
    
    if (!fs.existsSync(nodePath)) {
        log('❌ Node file not found!', 'red');
        return false;
    }
    
    const nodeContent = fs.readFileSync(nodePath, 'utf8');
    
    const requiredElements = [
        'export class GoogleAdsConversion implements INodeType',
        'description: INodeTypeDescription',
        'async execute(this: IExecuteFunctions)',
        'getAuthenticatedHeaders',
        'validateCredentials',
        'buildConversionPayload',
        'uploadConversion',
        'executeWithRetry',
        'parseApiError'
    ];
    
    let allFound = true;
    
    requiredElements.forEach(element => {
        if (nodeContent.includes(element)) {
            log(`  ✅ Found: ${element}`, 'green');
        } else {
            log(`  ❌ Missing: ${element}`, 'red');
            allFound = false;
        }
    });
    
    return allFound;
}

function validateCredentialsStructure() {
    log('\n🔍 Validating Credentials Structure...', 'blue');
    
    const credentialsPath = path.join(__dirname, '..', 'credentials', 'GoogleAdsOAuth2.credentials.ts');
    
    if (!fs.existsSync(credentialsPath)) {
        log('❌ Credentials file not found!', 'red');
        return false;
    }
    
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    
    const requiredElements = [
        'export class GoogleAdsOAuth2 implements ICredentialType',
        'extends = [\'oAuth2Api\']',
        'developerToken',
        'customerId',
        'clientId',
        'clientSecret'
    ];
    
    let allFound = true;
    
    requiredElements.forEach(element => {
        if (credentialsContent.includes(element)) {
            log(`  ✅ Found: ${element}`, 'green');
        } else {
            log(`  ❌ Missing: ${element}`, 'red');
            allFound = false;
        }
    });
    
    return allFound;
}

function validatePackageStructure() {
    log('\n🔍 Validating Package Structure...', 'blue');
    
    const packagePath = path.join(__dirname, '..', 'package.json');
    
    if (!fs.existsSync(packagePath)) {
        log('❌ package.json not found!', 'red');
        return false;
    }
    
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const checks = [
        { 
            condition: packageData.name === '@jaimeneto85/n8n-nodes-google-ads-conversion',
            message: 'Package name'
        },
        {
            condition: packageData.n8n && packageData.n8n.n8nNodesApiVersion === 1,
            message: 'n8n API version'
        },
        {
            condition: packageData.n8n && packageData.n8n.nodes && packageData.n8n.nodes.length > 0,
            message: 'Node registration'
        },
        {
            condition: packageData.n8n && packageData.n8n.credentials && packageData.n8n.credentials.length > 0,
            message: 'Credentials registration'
        }
    ];
    
    let allValid = true;
    
    checks.forEach(check => {
        if (check.condition) {
            log(`  ✅ ${check.message}`, 'green');
        } else {
            log(`  ❌ ${check.message}`, 'red');
            allValid = false;
        }
    });
    
    return allValid;
}

function validateDocumentation() {
    log('\n🔍 Validating Documentation...', 'blue');
    
    const requiredFiles = [
        'README.md',
        'docs/oauth-scopes.md',
        'docs/testing-guide.md'
    ];
    
    let allFound = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            log(`  ✅ Found: ${file}`, 'green');
        } else {
            log(`  ❌ Missing: ${file}`, 'red');
            allFound = false;
        }
    });
    
    return allFound;
}

function validateTestData() {
    log('\n🔍 Validating Test Data...', 'blue');
    
    const testData = loadTestData();
    
    const requiredSections = [
        'validTestCases',
        'invalidTestCases', 
        'privacyTestCases',
        'batchTestCases',
        'errorSimulation',
        'performanceTestData',
        'mockResponses'
    ];
    
    let allValid = true;
    
    requiredSections.forEach(section => {
        if (testData[section]) {
            log(`  ✅ Found section: ${section}`, 'green');
        } else {
            log(`  ❌ Missing section: ${section}`, 'red');
            allValid = false;
        }
    });
    
    // Validate specific test cases
    if (testData.validTestCases) {
        const requiredTestCases = [
            'gclid_conversion',
            'enhanced_conversion',
            'gbraid_conversion',
            'wbraid_conversion',
            'validation_only'
        ];
        
        requiredTestCases.forEach(testCase => {
            if (testData.validTestCases[testCase]) {
                log(`  ✅ Found test case: ${testCase}`, 'green');
            } else {
                log(`  ❌ Missing test case: ${testCase}`, 'red');
                allValid = false;
            }
        });
    }
    
    return allValid;
}

function generateTestReport() {
    log('\n📊 Generating Test Report...', 'blue');
    
    const testData = loadTestData();
    
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            validTestCases: Object.keys(testData.validTestCases || {}).length,
            invalidTestCases: Object.keys(testData.invalidTestCases || {}).length,
            privacyTestCases: Object.keys(testData.privacyTestCases || {}).length,
            batchTestCases: (testData.batchTestCases || []).length,
            errorScenarios: Object.keys(testData.errorSimulation || {}).length,
            mockResponses: Object.keys(testData.mockResponses || {}).length
        },
        testCategories: {
            authentication: [
                'Valid credentials',
                'Invalid developer token',
                'Invalid customer ID',
                'Missing credentials'
            ],
            validation: [
                'Required fields validation',
                'Format validation',
                'Identification method validation',
                'DateTime format validation'
            ],
            apiIntegration: [
                'GCLID conversions',
                'Enhanced conversions',
                'GBRAID/WBRAID conversions',
                'Validation mode'
            ],
            errorHandling: [
                'HTTP error scenarios',
                'Network error scenarios',
                'Custom error classes',
                'Error categorization'
            ],
            retryLogic: [
                'Exponential backoff',
                'Rate limit handling',
                'Retry decision logic',
                'Maximum retry limits'
            ],
            privacy: [
                'GDPR consent handling',
                'Data hashing',
                'EEA compliance',
                'Consent combinations'
            ]
        }
    };
    
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📄 Test report generated: ${reportPath}`, 'green');
    log(`📈 Summary:`, 'yellow');
    log(`  • Valid test cases: ${report.summary.validTestCases}`, 'reset');
    log(`  • Invalid test cases: ${report.summary.invalidTestCases}`, 'reset');
    log(`  • Privacy test cases: ${report.summary.privacyTestCases}`, 'reset');
    log(`  • Batch test cases: ${report.summary.batchTestCases}`, 'reset');
    log(`  • Error scenarios: ${report.summary.errorScenarios}`, 'reset');
    log(`  • Mock responses: ${report.summary.mockResponses}`, 'reset');
    
    return report;
}

function runAllTests() {
    log(`${'='.repeat(60)}`, 'bold');
    log('🚀 Google Ads Conversion Node - Test Suite', 'bold');
    log(`${'='.repeat(60)}`, 'bold');
    
    const tests = [
        { name: 'Node Structure', fn: validateNodeStructure },
        { name: 'Credentials Structure', fn: validateCredentialsStructure },
        { name: 'Package Structure', fn: validatePackageStructure },
        { name: 'Documentation', fn: validateDocumentation },
        { name: 'Test Data', fn: validateTestData }
    ];
    
    const results = [];
    
    tests.forEach(test => {
        try {
            const result = test.fn();
            results.push({ name: test.name, passed: result });
        } catch (error) {
            log(`❌ Test "${test.name}" failed with error: ${error.message}`, 'red');
            results.push({ name: test.name, passed: false, error: error.message });
        }
    });
    
    // Generate test report
    const report = generateTestReport();
    
    // Summary
    log('\n📋 Test Results Summary:', 'bold');
    log(`${'='.repeat(40)}`, 'blue');
    
    let totalPassed = 0;
    results.forEach(result => {
        if (result.passed) {
            log(`✅ ${result.name}`, 'green');
            totalPassed++;
        } else {
            log(`❌ ${result.name}`, 'red');
            if (result.error) {
                log(`   Error: ${result.error}`, 'red');
            }
        }
    });
    
    log(`\n🎯 Overall Result: ${totalPassed}/${results.length} tests passed`, 
          totalPassed === results.length ? 'green' : 'yellow');
    
    if (totalPassed === results.length) {
        log('\n🎉 All validation tests passed! The node structure is ready for testing.', 'green');
    } else {
        log('\n⚠️  Some validation tests failed. Please review the issues above.', 'yellow');
    }
    
    log('\n📝 Next Steps:', 'blue');
    log('  1. Install dependencies: npm install', 'reset');
    log('  2. Build the project: npm run build', 'reset');
    log('  3. Test in n8n environment with real credentials', 'reset');
    log('  4. Run integration tests with Google Ads API', 'reset');
    log('  5. Perform load testing if needed', 'reset');
    
    process.exit(totalPassed === results.length ? 0 : 1);
}

// Run the test suite
runAllTests(); 