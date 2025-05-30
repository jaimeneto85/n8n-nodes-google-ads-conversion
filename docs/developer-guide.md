# Google Ads Conversion Node - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Implementation Details](#implementation-details)
5. [Testing](#testing)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)
8. [Security & Privacy](#security--privacy)
9. [Contributing](#contributing)
10. [Release Process](#release-process)

## Architecture Overview

The Google Ads Conversion Node is built as a custom n8n node that integrates with the Google Ads API v14 to enable automated conversion tracking. The node follows n8n's architecture patterns and implements advanced features for production-grade usage.

### Core Components

```
GoogleAdsConversion.node.ts
├── Node Definition (INodeTypeDescription)
├── Authentication Handling (OAuth2)
├── Input Validation & Sanitization
├── Batch Processing Engine
├── Retry Logic with Exponential Backoff
├── Error Classification & Handling
├── Privacy-Compliant Data Processing
└── Debug & Monitoring Features
```

### Design Principles
- **SOLID Principles**: Single responsibility, open/closed, dependency inversion
- **DRY**: Reusable components and utilities
- **Security-First**: Automatic data hashing and privacy compliance
- **Production-Ready**: Comprehensive error handling and monitoring
- **Performance-Optimized**: Batch processing and efficient API usage

## Project Structure

```
google-ads-conversion/
├── nodes/
│   └── GoogleAdsConversion/
│       ├── GoogleAdsConversion.node.ts      # Main node implementation
│       ├── description.ts                   # Node properties definition
│       └── googleAds.svg                   # Node icon
├── credentials/
│   └── GoogleAdsOAuth2.credentials.ts      # OAuth2 credential definition
├── docs/
│   ├── user-guide.md                       # User documentation
│   ├── developer-guide.md                  # This file
│   └── api-reference.md                    # API reference
├── tests/
│   ├── run-tests.js                        # Test runner
│   ├── test-data.json                      # Test data
│   └── examples/                           # Usage examples
├── package.json                            # Package configuration
├── tsconfig.json                           # TypeScript configuration
└── README.md                               # Project overview
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- TypeScript 4.9+
- n8n development environment
- Google Ads API access (for testing)

### Local Development

1. **Clone Repository**:
```bash
git clone <repository-url>
cd google-ads-conversion
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Build Project**:
```bash
npm run build
```

4. **Link to n8n** (for testing):
```bash
# In your n8n installation
npm link /path/to/google-ads-conversion
```

5. **Start n8n**:
```bash
n8n start
```

### Development Commands

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Package for distribution
npm run package
```

## Implementation Details

### Authentication Flow

The node uses OAuth2 authentication with Google Ads API:

```typescript
// Credential validation and header setup
private async getAuthenticatedHeaders(executeFunctions: IExecuteFunctions): Promise<Record<string, string>> {
    const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
    
    return {
        'developer-token': credentials.developerToken,
        'login-customer-id': credentials.customerId,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };
}
```

### Data Processing Pipeline

1. **Input Validation**: Comprehensive parameter validation
2. **Data Transformation**: Convert n8n parameters to API format
3. **Privacy Processing**: Automatic hashing for enhanced conversions
4. **Batch Organization**: Group items for optimal API usage
5. **API Communication**: Execute with retry logic
6. **Response Processing**: Parse and format results

### Enhanced Conversions Implementation

User data is automatically hashed using SHA-256 for privacy compliance:

```typescript
private async hashString(input: string): Promise<string> {
    if (!input || input.trim() === '') {
        return '';
    }
    
    const normalized = input.toLowerCase().trim();
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
```

### Batch Processing Engine

The batch processing system efficiently handles large datasets:

```typescript
// Configurable batch processing
private async processBatchItems(executeFunctions: IExecuteFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
    const batchSize = Math.min(Math.max(this.getBatchSize(), 1), 2000);
    const batches = this.groupIntoBatches(conversions, batchSize);
    
    // Process batches with configurable error handling
    for (const [index, batch] of batches.entries()) {
        await this.processBatch(batch, index, batches.length);
    }
}
```

### Error Classification System

Custom error classes provide detailed error categorization:

```typescript
// Hierarchical error classification
class GoogleAdsAuthenticationError extends NodeOperationError { }
class GoogleAdsValidationError extends NodeOperationError { }
class GoogleAdsApiError extends NodeOperationError { }
class GoogleAdsRateLimitError extends NodeOperationError { }
```

### Retry Logic

Intelligent retry system with exponential backoff:

```typescript
private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    debugMode: boolean
): Promise<T> {
    const config = this.getRetryConfig();
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (!this.shouldRetry(error, attempt, config)) {
                throw this.parseApiError(error);
            }
            
            const delay = this.calculateDelay(attempt, config);
            await this.sleep(delay);
        }
    }
}
```

## Testing

### Test Structure

The project includes comprehensive testing:

```javascript
// Automated test runner
const tests = [
    { name: 'Node Structure Validation', test: validateNodeStructure },
    { name: 'Credentials Validation', test: validateCredentials },
    { name: 'Package Configuration', test: validatePackage },
    { name: 'Documentation Completeness', test: validateDocumentation },
    { name: 'Test Data Validation', test: validateTestData }
];
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
node tests/run-tests.js

# Validate package structure
npm run validate
```

### Test Data

Example test data for different scenarios:

```json
{
  "gclid_conversion": {
    "conversionAction": "customers/1234567890/conversionActions/987654321",
    "gclid": "test_gclid_123",
    "conversionDateTime": "2024-01-15 14:30:00+00:00",
    "conversionValue": 99.99
  },
  "enhanced_conversion": {
    "conversionAction": "customers/1234567890/conversionActions/987654321",
    "email": "test@example.com",
    "phoneNumber": "+1234567890",
    "conversionDateTime": "2024-01-15 14:30:00+00:00"
  }
}
```

### Integration Testing

For full integration testing with Google Ads API:

1. Set up test Google Ads account
2. Configure OAuth2 credentials
3. Use validation mode for safe testing
4. Test all identification methods
5. Verify batch processing functionality

## Error Handling

### Error Classification Matrix

| Error Type | HTTP Code | Retry | Description |
|------------|-----------|-------|-------------|
| Authentication | 401, 403 | No | Invalid credentials |
| Validation | 400 | No | Invalid input data |
| Rate Limit | 429 | Yes | API quota exceeded |
| Server Error | 5xx | Yes | Temporary server issues |
| Network Error | - | Yes | Connection problems |

### Custom Error Classes

```typescript
// Authentication errors
class GoogleAdsAuthenticationError extends NodeOperationError {
    constructor(node: any, message: string) {
        super(node, `Authentication Error: ${message}`);
        this.name = 'GoogleAdsAuthenticationError';
    }
}

// API errors with HTTP details
class GoogleAdsApiError extends NodeOperationError {
    public httpCode: number;
    public apiErrorCode?: string;
    
    constructor(node: any, message: string, httpCode: number, apiErrorCode?: string) {
        super(node, `Google Ads API Error: ${message}`);
        this.httpCode = httpCode;
        this.apiErrorCode = apiErrorCode;
    }
}
```

### Error Response Format

Consistent error response structure:

```json
{
  "success": false,
  "error": "Authentication failed. Please verify your OAuth2 credentials.",
  "errorType": "GoogleAdsAuthenticationError",
  "itemIndex": 0,
  "retryable": false,
  "debugInfo": {
    "httpCode": 401,
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

## Performance Considerations

### Batch Processing Optimization

- **Optimal Batch Size**: 100-500 items for best performance
- **Memory Management**: Streaming for large datasets
- **API Efficiency**: Up to 2000x reduction in API calls
- **Rate Limit Compliance**: Automatic throttling

### Memory Usage

```typescript
// Memory-efficient batch processing
private groupIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
}
```

### Monitoring & Observability

Built-in metrics and logging:

- Request/response timing
- Batch processing statistics
- Error rates and types
- API quota usage
- Authentication events

## Security & Privacy

### Data Handling

- **Automatic Hashing**: SHA-256 for user identifiers
- **No Data Storage**: Processed data not persisted
- **Secure Transmission**: HTTPS-only communication
- **Credential Management**: OAuth2 with token refresh

### Privacy Compliance

- **GDPR Compliance**: Consent field handling
- **Data Minimization**: Only required fields processed
- **Right to Erasure**: No data retention
- **Audit Trail**: Comprehensive logging

### Security Best Practices

```typescript
// Secure string hashing
private async hashString(input: string): Promise<string> {
    const normalized = input.toLowerCase().trim();
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

// Credential validation
private async validateCredentials(headers: Record<string, string>): Promise<void> {
    // Test API connectivity without exposing credentials
    const testPayload = { query: 'SELECT customer.id FROM customer LIMIT 1' };
    await this.executeWithRetry(() => this.apiRequest(testPayload));
}
```

## Contributing

### Development Workflow

1. **Fork Repository**: Create a personal fork
2. **Create Branch**: `git checkout -b feature/new-feature`
3. **Implement Changes**: Follow coding standards
4. **Add Tests**: Ensure comprehensive test coverage
5. **Update Documentation**: Keep docs current
6. **Submit PR**: Create pull request with description

### Coding Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for n8n patterns
- **Prettier**: Automatic code formatting
- **No Comments**: Self-documenting code preferred
- **SOLID Principles**: Follow design patterns

### Code Review Checklist

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Backward compatibility maintained

### Commit Message Format

```
type(scope): description

Examples:
feat(batch): add parallel processing support
fix(auth): resolve token refresh issue
docs(api): update authentication examples
test(integration): add Google Ads API tests
```

## Release Process

### Version Management

Follow semantic versioning (SemVer):

- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### Release Checklist

1. **Update Version**: Bump in package.json
2. **Update Changelog**: Document all changes
3. **Run Tests**: Ensure all tests pass
4. **Build Package**: `npm run package`
5. **Test Package**: Verify installation
6. **Create Release**: Tag and publish
7. **Update Documentation**: Publish updated docs

### Continuous Integration

```yaml
# GitHub Actions workflow
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### Distribution

- **npm Registry**: Primary distribution method
- **GitHub Releases**: Source code and binaries
- **n8n Community**: Community node registry
- **Documentation**: Updated websites and wikis

## API Reference

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| operation | string | Yes | Operation type |
| conversionAction | string | Yes | Conversion action ID |
| conversionDateTime | string | Yes | Conversion timestamp |
| identificationMethod | string | Yes | User identification method |
| enableBatchProcessing | boolean | No | Enable batch mode |
| debugMode | boolean | No | Enable debug logging |

### Credential Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| developerToken | string | Yes | Google Ads developer token |
| customerId | string | Yes | Google Ads customer ID |
| clientId | string | Yes | OAuth2 client ID |
| clientSecret | string | Yes | OAuth2 client secret |

### Response Format

```typescript
interface ConversionResponse {
    success: boolean;
    message: string;
    operation: string;
    conversion: object;
    response?: object;
    error?: string;
    debugInfo?: object;
}
```

---

*This developer guide is for Google Ads Conversion Node v1.0.0* 