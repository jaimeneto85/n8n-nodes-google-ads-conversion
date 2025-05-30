# Google Ads Conversion Node for n8n

[![npm version](https://badge.fury.io/js/%40jaimeneto85%2Fn8n-nodes-google-ads-conversion.svg)](https://badge.fury.io/js/%40jaimeneto85%2Fn8n-nodes-google-ads-conversion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-orange)](https://n8n.io)

An advanced n8n community node for tracking conversions in Google Ads with comprehensive support for batch processing, enhanced conversions, privacy compliance, and production-grade error handling.

## 🌟 Key Features

### 🎯 **Multiple Identification Methods**
- **GCLID**: Standard Google Click ID conversion tracking
- **Enhanced Conversions**: Privacy-safe user data matching with automatic SHA-256 hashing
- **GBRAID**: iOS app install conversion tracking (iOS 14.5+)
- **WBRAID**: iOS web-to-app conversion tracking

### ⚡ **High-Performance Batch Processing**
- Process up to **2000 conversions per API call**
- **3 processing modes**: Partial Failure, Fail Fast, Continue on Error
- Real-time progress tracking and statistics
- Automatic batch size optimization (1-2000 range)

### 🔐 **Privacy & Compliance**
- **GDPR/EEA compliance** with consent management
- **Automatic data hashing** (SHA-256) for user identifiers
- **Zero data retention** - processed data never stored
- Privacy-first design with data minimization

### 🛡️ **Enterprise-Grade Reliability**
- **Intelligent retry logic** with exponential backoff and jitter
- **Custom error classification** for different failure types
- **Rate limit handling** with automatic throttling
- **Comprehensive logging** for monitoring and debugging

### 🎛️ **Developer Experience**
- **Validation mode** for testing without uploading data
- **Debug mode** with detailed request/response logging
- **TypeScript implementation** with full type safety
- **Extensive documentation** and examples

## 📦 Installation

### Option 1: npm Installation (Recommended)
```bash
npm install @jaimeflneto/n8n-nodes-google-ads-conversion
```

### Option 2: n8n Community Nodes
1. In n8n, go to **Settings** → **Community Nodes**
2. Enter: `@jaimeflneto/n8n-nodes-google-ads-conversion`
3. Click **Install**
4. Restart n8n

### Option 3: Manual Installation
1. Download the latest release
2. Extract to your n8n custom nodes directory
3. Run `npm install` in the extracted directory
4. Restart n8n

## 🚀 Quick Start

### 1. Prerequisites
- Google Ads account with appropriate permissions
- Google Ads Developer Token ([apply here](https://developers.google.com/google-ads/api/docs/first-call/dev-token))
- Google Cloud Project with Google Ads API enabled
- OAuth2 credentials (Client ID & Secret)

### 2. Setup Credentials
1. In n8n, create a new **Google Ads OAuth2** credential
2. Fill in your Developer Token and Customer ID
3. Add OAuth2 Client ID and Secret
4. Complete the authorization flow

### 3. Configure Node
Add the Google Ads Conversion node to your workflow and configure:
- **Conversion Action ID**: From Google Ads conversion settings
- **Identification Method**: Choose GCLID, Enhanced, GBRAID, or WBRAID
- **Conversion Data**: Value, currency, timestamp, etc.

## 💡 Usage Examples

### Basic GCLID Conversion
```json
{
  "operation": "uploadClickConversion",
  "conversionAction": "customers/1234567890/conversionActions/987654321",
  "conversionDateTime": "2025-01-15 14:30:00+00:00",
  "conversionValue": 99.99,
  "currencyCode": "USD",
  "orderId": "order_12345",
  "identificationMethod": "gclid",
  "gclid": "Cj0KCQiA..."
}
```

### Enhanced Conversion with Privacy Compliance
```json
{
  "operation": "uploadClickConversion",
  "conversionAction": "customers/1234567890/conversionActions/987654321",
  "conversionDateTime": "2025-01-15 14:30:00+00:00",
  "conversionValue": 149.99,
  "currencyCode": "USD",
  "identificationMethod": "enhanced",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "adUserDataConsent": "GRANTED",
  "adPersonalizationConsent": "GRANTED"
}
```

### Batch Processing Configuration
```json
{
  "enableBatchProcessing": true,
  "batchSize": 500,
  "batchProcessingMode": "partialFailure",
  "showProgress": true
}
```

## 📚 Documentation

- **[User Guide](docs/user-guide.md)**: Complete setup and usage instructions
- **[Developer Guide](docs/developer-guide.md)**: Architecture and development details
- **[API Reference](docs/api-reference.md)**: Complete parameter reference
- **[Changelog](CHANGELOG.md)**: Version history and updates

## 🔧 Configuration Reference

### Required Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `conversionAction` | Conversion action ID | `customers/123/conversionActions/456` |
| `conversionDateTime` | Conversion timestamp | `2025-01-15 14:30:00+00:00` |
| `identificationMethod` | User identification method | `gclid`, `enhanced`, `gbraid`, `wbraid` |

### Optional Parameters
| Parameter | Description | Default |
|-----------|-------------|---------|
| `conversionValue` | Monetary value | `0` |
| `currencyCode` | Currency code | `USD` |
| `orderId` | Transaction ID | - |
| `validateOnly` | Test mode | `false` |
| `debugMode` | Debug logging | `false` |

### Batch Processing
| Parameter | Description | Default |
|-----------|-------------|---------|
| `enableBatchProcessing` | Enable batch mode | `false` |
| `batchSize` | Items per batch | `100` |
| `batchProcessingMode` | Error handling mode | `partialFailure` |
| `showProgress` | Progress logging | `true` |

## 🧪 Testing

### Automated Tests
```bash
npm test
```

### Validation Mode
Enable `validateOnly` to test configurations without uploading data to Google Ads.

### Debug Mode
Enable `debugMode` for comprehensive logging of requests, responses, and processing details.

## 🐛 Troubleshooting

### Common Issues

#### Authentication Errors
- Verify developer token is approved and active
- Check OAuth2 credentials are correctly configured
- Ensure customer ID format is correct (123-456-7890)

#### Validation Errors
- Verify all required fields are provided
- Check date format: `YYYY-MM-DD HH:MM:SS+TZ`
- For enhanced conversions, provide at least one user identifier

#### Rate Limiting
- Enable batch processing for high volumes
- Node automatically handles retries with exponential backoff
- Monitor Google Ads API quotas

### Debug Information
Enable debug mode to see:
- Request payloads and headers
- Response data and status codes
- Retry attempts and delays
- Error details with stack traces

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/developer-guide.md#contributing) for details.

### Development Setup
```bash
git clone https://github.com/jaimeneot85/n8n-nodes-google-ads-conversion.git
cd n8n-nodes-google-ads-conversion
npm install
npm run dev
```

### Code Standards
- TypeScript with strict type checking
- ESLint for code quality
- Prettier for formatting
- SOLID principles and DRY implementation

## 📊 Performance

### Batch Processing Benefits
- **Up to 2000x reduction** in API calls
- **Improved throughput** for large datasets
- **Reduced rate limiting** exposure
- **Better resource utilization**

### Memory Efficiency
- Streaming batch processing
- No data persistence
- Optimized memory usage for large datasets

## 🔒 Security & Privacy

### Data Protection
- **Zero data retention**: No conversion data stored
- **Secure transmission**: HTTPS-only communication
- **Credential security**: OAuth2 with token refresh
- **Automatic hashing**: SHA-256 for user identifiers

### Privacy Compliance
- **GDPR support**: Comprehensive consent handling
- **Data minimization**: Only required fields processed
- **User control**: Configurable consent levels
- **Audit trail**: Comprehensive logging

## 📈 Roadmap

### Upcoming Features
- Offline conversion support
- Bulk conversion import
- Analytics integration
- Custom audience support
- Advanced attribution models

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- **Documentation**: [User Guide](docs/user-guide.md) | [Developer Guide](docs/developer-guide.md)
- **Issues**: [GitHub Issues](https://github.com/jaimeneto85/n8n-nodes-google-ads-conversion/issues)
- **Community**: [n8n Community Forum](https://community.n8n.io/)
- **Email**: [jaimeflneto@gmail.com](mailto:jaimeflneto@gmail.com)

## 🙏 Acknowledgments

- [n8n.io](https://n8n.io) for the amazing workflow automation platform
- [Google Ads API](https://developers.google.com/google-ads/api/) for comprehensive conversion tracking
- The n8n community for feedback and contributions

---

**Made with ❤️ by [Jaime Lima Neto](https://linkedin.com/in/jaimeflneto)**

*If this project helps your business, consider [sponsoring me](https://github.com/sponsors/jaimeneto85) to support continued development.* 