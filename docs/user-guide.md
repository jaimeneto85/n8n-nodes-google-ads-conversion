# Google Ads Conversion Node - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Setup & Configuration](#setup--configuration)
5. [Usage Examples](#usage-examples)
6. [Batch Processing](#batch-processing)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [FAQ](#faq)

## Overview

The Google Ads Conversion Node enables you to send conversion events to Google Ads for campaign optimization and performance tracking. This node supports multiple identification methods, batch processing, and comprehensive privacy compliance features.

### Key Features
- **Multiple Identification Methods**: GCLID, Enhanced Conversions, GBRAID, WBRAID
- **Batch Processing**: Process up to 2000 conversions per API call
- **Privacy Compliance**: GDPR/EEA consent handling with automatic data hashing
- **Advanced Error Handling**: Intelligent retry logic with exponential backoff
- **Debug Mode**: Comprehensive logging for troubleshooting
- **Validation Mode**: Test configurations without sending data

## Prerequisites

Before using this node, you need:

1. **Google Ads Account** with appropriate permissions
2. **Google Ads Developer Token** - Apply at [Google Ads API Center](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
3. **Google Cloud Project** with Google Ads API enabled
4. **OAuth2 Credentials** (Client ID & Secret)
5. **n8n Instance** (self-hosted or cloud)

## Installation

### Option 1: npm Installation (Recommended)
```bash
npm install @jaimeflneto/n8n-nodes-google-ads-conversion
```

### Option 2: Manual Installation
1. Download the node package
2. Place in your n8n custom nodes directory
3. Restart n8n

### Option 3: n8n Community Nodes
```bash
# In your n8n installation directory
npm install @jaimeflneto/n8n-nodes-google-ads-conversion
```

## Setup & Configuration

### Step 1: Create Google Ads API Credentials

1. **Get Developer Token**:
   - Visit [Google Ads API Center](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
   - Apply for developer token
   - Wait for approval (can take several days)

2. **Set up OAuth2**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable Google Ads API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your n8n redirect URI: `https://your-n8n-instance.com/rest/oauth2-credential/callback`

### Step 2: Configure n8n Credentials

1. **Create Google Ads OAuth2 Credential**:
   - In n8n, go to "Credentials" → "Add Credential"
   - Search for "Google Ads OAuth2"
   - Fill in the required fields:
     - **Developer Token**: Your approved Google Ads developer token
     - **Customer ID**: Your Google Ads customer ID (format: 123-456-7890)
     - **Client ID**: From Google Cloud Console
     - **Client Secret**: From Google Cloud Console
   - Complete OAuth2 authorization flow

### Step 3: Find Your Conversion Action ID

1. In Google Ads, go to **Tools & Settings** → **Conversions**
2. Find your conversion action
3. Copy the Conversion Action ID (e.g., `AW-123456789/AbCdEfGhIjKlMnOp`)

## Usage Examples

### Example 1: Basic GCLID Conversion

```json
{
  "operation": "uploadClickConversion",
  "conversionAction": "customers/1234567890/conversionActions/987654321",
  "conversionDateTime": "2024-01-15 14:30:00+00:00",
  "conversionValue": 99.99,
  "currencyCode": "USD",
  "orderId": "order_12345",
  "identificationMethod": "gclid",
  "gclid": "Cj0KCQiA...",
  "validateOnly": false,
  "debugMode": false
}
```

### Example 2: Enhanced Conversion with User Data

```json
{
  "operation": "uploadClickConversion",
  "conversionAction": "customers/1234567890/conversionActions/987654321",
  "conversionDateTime": "2024-01-15 14:30:00+00:00",
  "conversionValue": 149.99,
  "currencyCode": "USD",
  "orderId": "order_67890",
  "identificationMethod": "enhanced",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "adUserDataConsent": "GRANTED",
  "adPersonalizationConsent": "GRANTED"
}
```

### Example 3: iOS App Install (GBRAID)

```json
{
  "operation": "uploadClickConversion",
  "conversionAction": "customers/1234567890/conversionActions/555666777",
  "conversionDateTime": "2024-01-15 15:45:00+00:00",
  "conversionValue": 0,
  "identificationMethod": "gbraid",
  "gbraid": "1.2.xyz789"
}
```

## Batch Processing

For high-volume conversion tracking, enable batch processing to improve performance:

### Configuration
- **Enable Batch Processing**: `true`
- **Batch Size**: `100` (recommended, max 2000)
- **Batch Processing Mode**: `partialFailure` (recommended)
- **Show Progress**: `true`

### Batch Processing Modes

1. **Partial Failure (Recommended)**:
   - Processes successful conversions even if some fail
   - Provides detailed per-conversion results
   - Uses Google Ads partial failure policy

2. **Fail Fast**:
   - Stops on first error
   - Best for validation scenarios
   - Fastest failure feedback

3. **Continue on Error**:
   - Processes all batches regardless of errors
   - Provides comprehensive error reporting
   - Best for large datasets with expected failures

### Performance Benefits
- **Up to 2000x** reduction in API calls
- **Improved throughput** for large datasets
- **Reduced rate limiting** exposure
- **Better resource utilization**

## Troubleshooting

### Common Issues

#### Authentication Errors
```
Error: Authentication failed. Please verify your OAuth2 credentials and developer token.
```

**Solutions**:
- Verify developer token is approved and active
- Check OAuth2 credentials are correctly configured
- Ensure customer ID format is correct (123-456-7890)
- Re-authorize OAuth2 if tokens expired

#### Validation Errors
```
Error: GCLID is required when using GCLID identification method
```

**Solutions**:
- Ensure all required fields are provided
- Check date format: `YYYY-MM-DD HH:MM:SS+TZ`
- Verify conversion action ID exists and is accessible
- For enhanced conversions, provide at least one user identifier

#### Rate Limiting
```
Error: Rate limit exceeded. Please implement retry logic or reduce request frequency.
```

**Solutions**:
- Enable batch processing to reduce API calls
- The node automatically handles retries with exponential backoff
- Consider reducing request frequency
- Monitor Google Ads API quotas

### Debug Mode

Enable debug mode for detailed troubleshooting:

1. Set `debugMode` to `true`
2. Check n8n execution logs for detailed information
3. Debug mode logs include:
   - Request payloads
   - Response data
   - Authentication headers
   - Processing timestamps
   - Error details with stack traces

### Validation Mode

Use validation mode to test configurations:

1. Set `validateOnly` to `true`
2. Node will validate data without actually uploading
3. Perfect for testing before production deployment

## Best Practices

### Data Quality
- **Use Order IDs**: Always include unique order/transaction IDs
- **Accurate Timestamps**: Ensure conversion timestamps are accurate
- **Valid Identifiers**: Verify GCLIDs, emails, and phone numbers are correct

### Privacy Compliance
- **Obtain Consent**: Always obtain proper user consent for data processing
- **Set Consent Fields**: Configure `adUserDataConsent` and `adPersonalizationConsent`
- **Secure Data**: The node automatically hashes user data for enhanced conversions

### Performance Optimization
- **Use Batch Processing**: For >10 conversions, enable batch processing
- **Optimal Batch Size**: Use 100-500 items per batch for best performance
- **Monitor Quotas**: Keep track of Google Ads API usage limits

### Error Handling
- **Enable Continue on Fail**: For production workflows with large datasets
- **Monitor Logs**: Regularly check logs for patterns in failures
- **Set Up Alerts**: Configure monitoring for conversion upload failures

### Testing Strategy
- **Start with Validation Mode**: Test configurations before going live
- **Use Debug Mode**: Enable for initial setup and troubleshooting
- **Test All ID Methods**: Verify each identification method works correctly

## FAQ

### Q: What identification methods are supported?
A: The node supports:
- **GCLID**: Google Click ID for web conversions
- **Enhanced Conversions**: User data with automatic hashing
- **GBRAID**: iOS app install conversions
- **WBRAID**: iOS web-to-app conversions

### Q: How does batch processing work?
A: Batch processing groups multiple conversions into single API calls (up to 2000), dramatically reducing API usage and improving performance for large datasets.

### Q: Is user data secure with enhanced conversions?
A: Yes, all user data is automatically hashed using SHA-256 before sending to Google Ads. The original data never leaves your n8n instance.

### Q: What happens if some conversions fail in a batch?
A: With partial failure mode (recommended), successful conversions are processed while failed ones are reported with detailed error information.

### Q: Can I test without sending real data?
A: Yes, enable `validateOnly` mode to test your configuration without actually uploading conversions to Google Ads.

### Q: How do I handle GDPR compliance?
A: Set the `adUserDataConsent` and `adPersonalizationConsent` fields based on user consent. The node automatically includes this information in API calls.

### Q: What's the maximum batch size?
A: Google Ads API allows up to 2000 conversions per batch. The node automatically validates and adjusts batch sizes if needed.

### Q: How do I get a developer token?
A: Apply at the [Google Ads API Developer Token page](https://developers.google.com/google-ads/api/docs/first-call/dev-token). Approval can take several business days.

## Support

For additional support:
- Check the [n8n Community Forum](https://community.n8n.io/)
- Review [Google Ads API Documentation](https://developers.google.com/google-ads/api/)
- Submit issues on the project's GitHub repository
- Contact support through your n8n instance provider

---

*This documentation is for Google Ads Conversion Node v1.0.0* 