# Changelog

All notable changes to the Google Ads Conversion Node project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-05-30

### Added

#### Core Functionality
- **Google Ads Conversion Node**: Complete n8n node implementation for uploading conversion events to Google Ads API v14
- **OAuth2 Authentication**: Secure authentication using Google Ads OAuth2 with developer token support
- **Multiple Identification Methods**: Support for GCLID, Enhanced Conversions, GBRAID, and WBRAID identification
- **Conversion Parameters**: Comprehensive conversion data handling including value, currency, order ID, and timestamps

#### Batch Processing
- **High-Performance Batch Processing**: Process up to 2000 conversions per API call
- **Configurable Batch Modes**: 
  - Partial Failure (recommended): Continue processing successful conversions even if some fail
  - Fail Fast: Stop on first error for immediate feedback
  - Continue on Error: Process all batches regardless of individual failures
- **Progress Tracking**: Real-time batch processing progress monitoring
- **Smart Batch Sizing**: Automatic validation and adjustment of batch sizes (1-2000 range)

#### Enhanced Conversions & Privacy
- **Automatic Data Hashing**: SHA-256 hashing for user identifiers (email, phone, address data)
- **Privacy Compliance**: GDPR/EEA consent management with ad user data and personalization consent fields
- **Multiple User Identifiers**: Support for email, phone, names, and address information
- **Secure Data Handling**: No data persistence, automatic normalization and hashing

#### Error Handling & Reliability
- **Custom Error Classification**: Specialized error classes for authentication, validation, API, and rate limiting errors
- **Intelligent Retry Logic**: Exponential backoff with jitter for retryable errors
- **Comprehensive Error Reporting**: Detailed error messages with context and troubleshooting guidance
- **Rate Limit Handling**: Automatic retry with respect for Google Ads API rate limits

#### Debug & Validation Features
- **Debug Mode**: Comprehensive logging for request/response data, processing statistics, and error details
- **Validation Mode**: Test configurations without actually uploading data to Google Ads
- **Processing Timestamps**: Detailed timing information for performance monitoring
- **Authentication Validation**: Pre-execution credential and API connectivity testing

#### User Experience
- **Intuitive UI**: Well-organized parameter sections with helpful descriptions and hints
- **Validation Feedback**: Real-time parameter validation with specific error messages
- **Progress Indicators**: Batch processing progress with success/failure statistics
- **Comprehensive Documentation**: User guide, developer guide, and API reference

### Technical Implementation

#### Architecture
- **SOLID Principles**: Single responsibility, open/closed, and dependency inversion patterns
- **DRY Implementation**: Reusable utility functions and error handling systems
- **TypeScript**: Full TypeScript implementation with strict type checking
- **Memory Efficiency**: Streaming batch processing for large datasets

#### API Integration
- **Google Ads API v14**: Latest API version support with complete feature coverage
- **RESTful Communication**: HTTP/HTTPS API calls with proper header management
- **Token Management**: Automatic OAuth2 token handling and refresh
- **Response Parsing**: Comprehensive API response processing and error extraction

#### Testing & Quality Assurance
- **Automated Test Suite**: Comprehensive validation of node structure, credentials, and package configuration
- **Test Data**: Example test cases for all identification methods and scenarios
- **Code Validation**: ESLint and TypeScript compilation verification
- **Documentation Validation**: Automated checks for documentation completeness

### Configuration

#### Credentials
- **Developer Token**: Google Ads API developer token (required)
- **Customer ID**: Google Ads customer identifier (format: 123-456-7890)
- **OAuth2 Credentials**: Client ID and secret from Google Cloud Console
- **Automatic Token Refresh**: Seamless OAuth2 token renewal

#### Node Parameters
- **Operation Type**: Upload Click Conversion (extensible for future operations)
- **Conversion Data**: Action ID, date/time, value, currency, order ID
- **User Identification**: Method selection and identifier fields
- **Privacy Compliance**: Consent management fields for GDPR/EEA
- **Batch Processing**: Configuration for high-volume processing
- **Advanced Options**: Debug mode and validation-only testing

### Performance Metrics

#### Batch Processing Benefits
- **API Call Reduction**: Up to 2000x reduction in API calls for large datasets
- **Throughput Improvement**: Significant performance gains for bulk operations
- **Rate Limit Optimization**: Reduced exposure to API rate limiting
- **Resource Efficiency**: Better memory and network resource utilization

#### Error Recovery
- **Retry Success Rate**: Automatic recovery from transient network and server errors
- **Graceful Degradation**: Partial success processing with detailed error reporting
- **Fault Tolerance**: Continued operation despite individual conversion failures

### Security & Privacy

#### Data Protection
- **Zero Data Retention**: No conversion data stored or persisted
- **Secure Transmission**: HTTPS-only communication with Google Ads API
- **Credential Security**: OAuth2 with token-based authentication
- **Data Hashing**: Automatic SHA-256 hashing for user identifiers

#### Privacy Compliance
- **GDPR Support**: Comprehensive consent field handling for European users
- **Data Minimization**: Only required fields processed and transmitted
- **User Control**: Configurable consent levels for ad data usage
- **Audit Trail**: Comprehensive logging for compliance verification

### Documentation

#### User Documentation
- **Comprehensive User Guide**: Step-by-step setup and usage instructions
- **Usage Examples**: Real-world scenarios for all identification methods
- **Troubleshooting Guide**: Common issues and solutions
- **Best Practices**: Performance and security recommendations

#### Developer Documentation
- **Developer Guide**: Architecture overview and implementation details
- **API Reference**: Complete parameter and response documentation
- **Contributing Guidelines**: Development workflow and coding standards
- **Testing Instructions**: Test setup and validation procedures

### Distribution

#### Package Management
- **npm Package**: Ready for npm registry distribution
- **n8n Community Nodes**: Compatible with n8n community node system
- **Semantic Versioning**: Following SemVer for version management
- **Build System**: Automated build and packaging workflow

#### Installation Methods
- **npm Installation**: `npm install @jaimeneto85/n8n-nodes-google-ads-conversion`
- **Manual Installation**: Direct file placement in n8n custom nodes directory
- **Community Nodes**: Integration with n8n's community node registry

### Support & Maintenance

#### Community Support
- **GitHub Repository**: Open source with issue tracking and contributions
- **Documentation Website**: Comprehensive online documentation
- **n8n Community Forum**: Community support and discussions
- **Example Workflows**: Sample n8n workflows demonstrating usage

#### Future Roadmap
- **Additional Operations**: Support for other Google Ads API operations
- **Enhanced Analytics**: Conversion tracking analytics and reporting
- **Advanced Features**: Custom conversion models and attribution settings
- **Integration Improvements**: Enhanced n8n workflow integration features

---

## Future Versions

### Planned Features
- **Offline Conversion Support**: Support for offline conversion uploads
- **Conversion Import**: Bulk conversion import from files and databases
- **Analytics Integration**: Integration with Google Analytics for enhanced tracking
- **Custom Audiences**: Support for customer match and similar audiences
- **Advanced Attribution**: Custom attribution models and conversion paths

### API Updates
- **Google Ads API v15+**: Support for future API versions
- **New Identification Methods**: Support for emerging user identification standards
- **Enhanced Privacy Features**: Additional privacy and compliance features
- **Performance Optimizations**: Further batch processing and caching improvements

---

*For detailed technical information, see the [Developer Guide](docs/developer-guide.md)*
*For usage instructions, see the [User Guide](docs/user-guide.md)* 