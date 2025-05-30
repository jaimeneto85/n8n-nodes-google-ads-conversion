# Google Ads Conversion Node - Testing Guide

## Overview

This document outlines the comprehensive testing strategy for the Google Ads Conversion n8n node, covering unit tests, integration tests, error scenarios, and performance validation.

## Test Categories

### 1. Authentication Testing

#### OAuth2 Flow Testing
- **Valid Credentials**: Test with correct developer token, customer ID, and OAuth2 tokens
- **Invalid Developer Token**: Verify proper error handling for wrong/expired developer tokens
- **Invalid Customer ID**: Test with non-existent or unauthorized customer IDs
- **Expired OAuth2 Token**: Ensure automatic token refresh works correctly
- **Missing Credentials**: Verify error messages when credentials are not provided

#### Test Scenarios:
```json
{
  "valid_credentials": {
    "developerToken": "YOUR_DEVELOPER_TOKEN",
    "customerId": "1234567890",
    "oauth2_credentials": "valid_token"
  },
  "invalid_developer_token": {
    "developerToken": "invalid_token",
    "customerId": "1234567890"
  },
  "invalid_customer_id": {
    "developerToken": "YOUR_DEVELOPER_TOKEN", 
    "customerId": "0000000000"
  }
}
```

### 2. Input Validation Testing

#### Required Fields Validation
- **Missing Conversion Action**: Test without conversion action ID
- **Missing DateTime**: Test without conversion timestamp
- **Invalid DateTime Format**: Test with malformed date strings
- **Invalid Identification Method**: Test with unsupported methods

#### Identification Method Testing

**GCLID Testing:**
```json
{
  "valid_gclid": "TeSter-123.456_ABCdef",
  "invalid_gclid": "",
  "malformed_gclid": "invalid format"
}
```

**Enhanced Conversions Testing:**
```json
{
  "valid_enhanced": {
    "email": "test@example.com",
    "phoneNumber": "+1234567890",
    "firstName": "John",
    "lastName": "Doe"
  },
  "empty_enhanced": {
    "email": "",
    "phoneNumber": "",
    "firstName": "",
    "lastName": ""
  }
}
```

**GBRAID/WBRAID Testing:**
```json
{
  "valid_gbraid": "GBRAID_EXAMPLE_STRING",
  "valid_wbraid": "WBRAID_EXAMPLE_STRING"
}
```

### 3. API Integration Testing

#### Successful Conversion Upload
- **GCLID Conversion**: Standard conversion with Google Click ID
- **Enhanced Conversion**: Conversion with hashed user data
- **Value Conversion**: Conversion with monetary value and currency
- **Validate-Only Mode**: Test validation without actual upload

#### Test Data Examples:
```json
{
  "gclid_conversion": {
    "operation": "uploadClickConversion",
    "identificationMethod": "gclid",
    "gclid": "TeSter-123.456_ABCdef",
    "conversionAction": "customers/1234567890/conversionActions/987654321",
    "conversionDateTime": "2024-01-15 14:30:00+00:00",
    "conversionValue": 99.99,
    "currencyCode": "USD",
    "orderId": "ORDER_12345"
  },
  "enhanced_conversion": {
    "operation": "uploadClickConversion",
    "identificationMethod": "enhanced",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "conversionAction": "customers/1234567890/conversionActions/987654321",
    "conversionDateTime": "2024-01-15 14:30:00+00:00"
  }
}
```

### 4. Error Handling Testing

#### HTTP Error Scenarios
- **400 Bad Request**: Invalid parameters or malformed data
- **401 Unauthorized**: Authentication failures
- **403 Forbidden**: Access denied or insufficient permissions
- **404 Not Found**: Invalid conversion action or customer ID
- **429 Rate Limited**: API quota exceeded
- **500+ Server Errors**: Google Ads API service issues

#### Network Error Scenarios
- **Connection Timeout**: Simulate network timeouts
- **Connection Reset**: Test connection reset scenarios
- **DNS Resolution**: Test with unreachable hostnames

### 5. Retry Logic Testing

#### Retryable Scenarios
- **Rate Limiting (429)**: Should retry with exponential backoff
- **Server Errors (5xx)**: Should retry with increasing delays
- **Network Errors**: Should retry transient connection issues
- **Retry-After Header**: Should respect API-provided retry delays

#### Non-Retryable Scenarios
- **Authentication Errors (401/403)**: Should fail immediately
- **Validation Errors (400/404)**: Should fail immediately
- **Client Errors (4xx)**: Should not retry most client errors

#### Test Configuration:
```json
{
  "retry_config": {
    "maxRetries": 3,
    "baseDelayMs": 1000,
    "maxDelayMs": 30000,
    "retryableStatusCodes": [429, 500, 502, 503, 504],
    "retryableErrors": ["ECONNRESET", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"]
  }
}
```

### 6. Privacy Compliance Testing

#### GDPR/EEA Consent Testing
- **Granted Consent**: Test with both ad user data and personalization granted
- **Denied Consent**: Test with consent denied for both categories
- **Mixed Consent**: Test with one granted and one denied
- **Unknown Consent**: Test with consent status unknown

```json
{
  "consent_scenarios": {
    "full_consent": {
      "adUserDataConsent": "GRANTED",
      "adPersonalizationConsent": "GRANTED"
    },
    "no_consent": {
      "adUserDataConsent": "DENIED", 
      "adPersonalizationConsent": "DENIED"
    },
    "mixed_consent": {
      "adUserDataConsent": "GRANTED",
      "adPersonalizationConsent": "DENIED"
    }
  }
}
```

### 7. Performance Testing

#### Load Testing Scenarios
- **Single Conversion**: Test individual conversion processing
- **Batch Processing**: Test multiple conversions in sequence
- **Large Payload**: Test with maximum allowed data sizes
- **Concurrent Requests**: Test with multiple simultaneous operations

#### Performance Benchmarks
- **Response Time**: < 2 seconds for standard conversions
- **Retry Delays**: Proper exponential backoff timing
- **Memory Usage**: Minimal memory footprint per operation
- **Rate Limit Handling**: Graceful degradation under rate limits

## Testing Procedures

### Manual Testing Checklist

1. **Setup Phase**
   - [ ] Configure valid Google Ads credentials
   - [ ] Set up OAuth2 authentication
   - [ ] Verify n8n environment is ready

2. **Basic Functionality**
   - [ ] Test successful GCLID conversion upload
   - [ ] Test successful enhanced conversion upload
   - [ ] Test validation-only mode
   - [ ] Verify debug mode logging

3. **Error Scenarios**
   - [ ] Test with invalid credentials
   - [ ] Test with missing required fields
   - [ ] Test with malformed data
   - [ ] Verify error messages are clear and actionable

4. **Retry Logic**
   - [ ] Simulate rate limiting scenarios
   - [ ] Test server error handling
   - [ ] Verify exponential backoff behavior
   - [ ] Test retry limits are respected

5. **Privacy Compliance**
   - [ ] Test consent handling for EEA users
   - [ ] Verify enhanced conversion data hashing
   - [ ] Test with various consent combinations

### Automated Testing

#### Unit Test Structure
```
tests/
├── unit/
│   ├── authentication.test.ts
│   ├── validation.test.ts
│   ├── error-handling.test.ts
│   ├── retry-logic.test.ts
│   └── conversion-payload.test.ts
├── integration/
│   ├── api-integration.test.ts
│   ├── end-to-end.test.ts
│   └── performance.test.ts
└── fixtures/
    ├── test-data.json
    ├── error-responses.json
    └── mock-credentials.json
```

## Test Data Requirements

### Google Ads Test Environment
- **Developer Token**: Use Google Ads test developer token
- **Test Customer Account**: Use Google Ads test account
- **Test Conversion Actions**: Create test conversion actions
- **Test Campaign Data**: Set up test campaigns and ads

### Mock Data for Unit Tests
- **Valid/Invalid Credentials**: Comprehensive credential test cases
- **API Response Mocks**: Success and error response examples
- **Network Error Simulations**: Timeout and connection error mocks
- **Rate Limit Scenarios**: 429 responses with retry-after headers

## Success Criteria

### Functional Requirements
- [ ] All authentication flows work correctly
- [ ] All identification methods (GCLID, Enhanced, etc.) function properly
- [ ] Error handling provides clear, actionable messages
- [ ] Retry logic follows exponential backoff correctly
- [ ] Privacy compliance features work as designed

### Performance Requirements
- [ ] API calls complete within acceptable time limits
- [ ] Memory usage remains within reasonable bounds
- [ ] Retry delays don't exceed maximum thresholds
- [ ] Rate limiting is handled gracefully

### Reliability Requirements
- [ ] Node handles network failures gracefully
- [ ] Temporary API issues don't cause permanent failures
- [ ] Authentication token refresh works automatically
- [ ] Error recovery mechanisms function correctly

## Continuous Testing

### Monitoring Points
- **API Response Times**: Track Google Ads API performance
- **Error Rates**: Monitor authentication and API call failures
- **Retry Success Rates**: Track how often retries succeed
- **Rate Limit Events**: Monitor API quota usage

### Alerting Thresholds
- **High Error Rate**: > 5% of requests failing
- **Slow Response Time**: > 5 seconds average response time
- **Frequent Rate Limits**: > 10% of requests hitting rate limits
- **Authentication Failures**: > 1% of auth attempts failing

This comprehensive testing strategy ensures the Google Ads Conversion node is robust, reliable, and handles edge cases gracefully. 