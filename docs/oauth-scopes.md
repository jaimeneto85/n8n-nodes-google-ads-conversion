# Google Ads OAuth2 Scope Management

## Overview
This document explains the OAuth2 scope configuration for the Google Ads Conversion node and provides guidance for future scope management.

## Current Scope Configuration

### Primary Scope: `https://www.googleapis.com/auth/adwords`
- **Purpose**: Full access to Google Ads API
- **Permissions**: Read/write access to campaigns, ad groups, ads, keywords, and conversion tracking
- **Required for**: Conversion upload, campaign data access, and most Google Ads operations

## Scope Management Implementation

### Current Approach
- **Fixed Scope**: Currently using a single, comprehensive scope for simplicity
- **Access Level Selection**: UI option to indicate intended usage (Standard vs Full Management)
- **Future Ready**: Architecture supports multiple scopes if needed

### Access Levels

#### Standard Access
- Sufficient for conversion tracking operations
- Covers: uploadClickConversions, basic campaign data access
- Recommended for most integrations

#### Full Management Access  
- Complete Google Ads API access
- Covers: Campaign management, bid adjustments, ad creation
- Requires Google review process for production use

## Future Scope Expansion

### Potential Additional Scopes
If granular permissions are needed in the future:

```typescript
const GOOGLE_ADS_SCOPES = {
  // Current comprehensive scope
  ADWORDS: 'https://www.googleapis.com/auth/adwords',
  
  // Potential granular scopes (if Google provides them)
  ADWORDS_READONLY: 'https://www.googleapis.com/auth/adwords.readonly',
  CONVERSIONS_ONLY: 'https://www.googleapis.com/auth/adwords.conversions',
};
```

### Implementation Strategy for Multiple Scopes
If multiple scopes become necessary:

1. **UI Enhancement**: Convert scope from hidden to multiOptions field
2. **Dynamic Scope Building**: Concatenate selected scopes with spaces
3. **Validation**: Ensure compatible scope combinations
4. **Migration**: Handle existing single-scope configurations

## Security Considerations

### Principle of Least Privilege
- Current scope is comprehensive but Google-recommended for API access
- Google Ads API doesn't offer granular scopes as of v14
- Access control handled at Google Ads account level

### Token Security
- Offline access enabled for refresh token capability
- Consent prompt ensures user awareness of permissions
- n8n handles secure credential storage

## Implementation Notes

### Current Code Structure
```typescript
// Fixed scope in credentials
{
  displayName: 'Scope',
  name: 'scope',
  type: 'hidden',
  default: 'https://www.googleapis.com/auth/adwords',
}

// Access level indicator
{
  displayName: 'API Access Level',
  name: 'apiAccessLevel', 
  type: 'options',
  // ... UI guidance for users
}
```

### Future Enhancement Path
1. Monitor Google Ads API updates for granular scopes
2. Implement scope selection UI if needed
3. Add scope validation logic
4. Update documentation and testing procedures

## References
- [Google Ads API OAuth Guide](https://developers.google.com/google-ads/api/docs/oauth/overview)
- [Google Ads API Scopes](https://developers.google.com/google-ads/api/docs/oauth/scopes)
- [n8n OAuth2 Implementation](https://docs.n8n.io/integrations/creating-nodes/auth/oauth2/) 