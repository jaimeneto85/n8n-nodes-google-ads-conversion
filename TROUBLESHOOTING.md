# Google Ads Conversion Tracking - Troubleshooting Guide

## 403 Forbidden Error - "Forbidden - perhaps check your credentials?"

This error occurs when the Google Ads API denies access to your account. Here are the most common causes and solutions:

### 1. **OAuth2 Token Issues**
**Symptoms:** Error 403 on API calls
**Solutions:**
- **Re-authenticate your credentials** in n8n
- Go to your n8n credentials → Google Ads OAuth2 → Reconnect
- Make sure you're using the same Google account that has access to the Google Ads account

### 2. **Developer Token Problems**
**Symptoms:** Error 403 immediately when making API calls
**Solutions:**
- Verify your Developer Token is approved for **production use**
- Check in Google Ads Manager: Tools & Settings → Setup → API Center
- If using a test developer token, you can only access accounts you own
- Make sure the developer token matches the correct Google Ads account

### 3. **Account Type Configuration**
**Symptoms:** Error 403 with customer ID mismatches
**Solutions:**

#### For Regular Google Ads Accounts:
- Set **Account Type** to "Regular Google Ads Account"
- Use the same Customer ID in both authentication and target settings

#### For Manager Accounts (MCC):
- Set **Account Type** to "Manager Account (MCC)"
- Authenticate with the **manager account** credentials
- Select the specific **managed account** you want to upload conversions to
- Ensure the manager account has proper permissions to the managed account

### 4. **Customer ID Format Issues**
**Symptoms:** Invalid customer ID errors
**Solutions:**
- Customer ID should be **10 digits only** (no dashes)
- Example: `1234567890` (correct) vs `123-456-7890` (incorrect)
- Find it in the top right corner of your Google Ads interface

### 5. **API Access and Permissions**
**Symptoms:** Error 403 with permission messages
**Solutions:**
- Ensure Google Ads API is **enabled** in your Google Cloud Console
- Verify your Google Cloud project has the correct billing setup
- Check that the OAuth2 credentials have the correct scope: `https://www.googleapis.com/auth/adwords`

### 6. **Conversion Action Access**
**Symptoms:** Error 403 when uploading specific conversions
**Solutions:**
- Verify the Conversion Action ID exists in the target account
- Ensure the conversion action is **ENABLED** status
- Check that the conversion action belongs to the correct account
- Only accounts that created the conversion action can upload to it

## Quick Diagnosis Steps

### Step 1: Verify Account Configuration
1. Enable **Debug Mode** in the node settings
2. Check the logs for account type and customer ID information
3. Verify that authentication and target customer IDs match your setup

### Step 2: Test Basic API Access
1. First, test with a simple workflow without conversions
2. Use the Google Ads Search node or a basic query to verify access
3. If basic access fails, the issue is with authentication/permissions

### Step 3: Check Conversion Action
1. In Google Ads web interface, go to Tools & Settings → Conversions
2. Find your conversion action and note its ID
3. Verify it's enabled and accessible from the account you're uploading to

### Step 4: Validate Developer Token
1. Go to Google Ads Manager → Tools & Settings → Setup → API Center
2. Check your developer token status
3. Ensure it's approved for production (if needed)

## Common Configuration Examples

### Configuration for Regular Account
```
Account Type: Regular Google Ads Account
Customer ID: 1234567890 (in credentials)
Target: Same account (1234567890)
```

### Configuration for Manager Account
```
Account Type: Manager Account (MCC)
Customer ID: 9876543210 (manager account in credentials)
Managed Account: 1234567890 (selected from dropdown)
Target: Upload to managed account (1234567890)
```

## Debug Mode Information

When debug mode is enabled, you'll see detailed information in the logs:
- Account type configuration
- Customer IDs being used
- Request URLs and headers (tokens hidden)
- Permission diagnostics for 403 errors

## Additional Resources

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs)
- [OAuth2 Setup Guide](https://developers.google.com/google-ads/api/docs/oauth/overview)
- [Developer Token Guide](https://developers.google.com/google-ads/api/docs/first-call/dev-token)

## Still Having Issues?

If you're still experiencing problems:
1. Enable debug mode and check the detailed logs
2. Verify all credentials are fresh (re-authenticate if needed)
3. Test with the Google Ads API Explorer to isolate the issue
4. Check Google Ads account permissions and billing status 