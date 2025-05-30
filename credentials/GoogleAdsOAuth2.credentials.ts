import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GoogleAdsOAuth2 implements ICredentialType {
	name = 'googleAdsOAuth2';
	extends = ['oAuth2Api'];
	displayName = 'Google Ads OAuth2';
	documentationUrl = 'https://developers.google.com/google-ads/api/docs/oauth/overview';
	icon = 'file:googleAds.svg' as const;
	
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://accounts.google.com/o/oauth2/v2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth2.googleapis.com/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'https://www.googleapis.com/auth/adwords',
			description: 'Google Ads API scope for conversion tracking and management',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'API Access Level',
			name: 'apiAccessLevel',
			type: 'options',
			options: [
				{
					name: 'Standard Access',
					value: 'standard',
					description: 'Access to Google Ads API for conversion tracking and reporting',
				},
				{
					name: 'Full Management Access',
					value: 'full',
					description: 'Complete access to Google Ads API including campaign management (requires additional approval)',
				},
			],
			default: 'standard',
			description: 'Select the level of access needed for your integration',
			hint: 'Standard access is sufficient for conversion tracking. Full access requires Google review.',
		},
		{
			displayName: 'Developer Token',
			name: 'developerToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Google Ads Developer Token from Google Ads Manager account',
			hint: 'Found in Google Ads Manager under Tools & Settings > Setup > API Center',
		},
		{
			displayName: 'Customer ID',
			name: 'customerId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Google Ads Customer ID (without dashes)',
			placeholder: '1234567890',
			hint: 'Found in the top right corner of your Google Ads account (remove dashes)',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'OAuth2 Client ID from Google Cloud Console',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'OAuth2 Client Secret from Google Cloud Console',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'developer-token': '={{$credentials.developerToken}}',
				'login-customer-id': '={{$credentials.customerId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://googleads.googleapis.com/v14',
			url: '/customers/{{$credentials.customerId}}/googleAds:search',
			method: 'POST',
			headers: {
				'developer-token': '={{$credentials.developerToken}}',
				'login-customer-id': '={{$credentials.customerId}}',
			},
			body: {
				query: 'SELECT customer.id FROM customer LIMIT 1',
			},
		},
	};
} 