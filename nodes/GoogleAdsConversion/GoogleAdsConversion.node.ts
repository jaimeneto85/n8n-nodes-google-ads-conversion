import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { createHash } from 'crypto';

// Custom error classes for better error categorization
class GoogleAdsAuthenticationError extends NodeOperationError {
	constructor(node: any, message: string) {
		super(node, `Authentication Error: ${message}`);
		this.name = 'GoogleAdsAuthenticationError';
	}
}

class GoogleAdsValidationError extends NodeOperationError {
	constructor(node: any, message: string, field?: string) {
		const fieldInfo = field ? ` (Field: ${field})` : '';
		super(node, `Validation Error: ${message}${fieldInfo}`);
		this.name = 'GoogleAdsValidationError';
	}
}

class GoogleAdsApiError extends NodeOperationError {
	public httpCode: number;
	public apiErrorCode?: string;
	
	constructor(node: any, message: string, httpCode: number, apiErrorCode?: string) {
		super(node, `Google Ads API Error: ${message}`);
		this.name = 'GoogleAdsApiError';
		this.httpCode = httpCode;
		this.apiErrorCode = apiErrorCode;
	}
}

class GoogleAdsRateLimitError extends NodeOperationError {
	public retryAfter?: number;
	
	constructor(node: any, message: string, retryAfter?: number) {
		super(node, `Rate Limit Error: ${message}`);
		this.name = 'GoogleAdsRateLimitError';
		this.retryAfter = retryAfter;
	}
}

export class GoogleAdsConversion implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Ads Conversion',
		name: 'googleAdsConversion',
		icon: 'file:googleAds.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["conversionAction"]}}',
		description: 'Send conversion events to Google Ads for campaign optimization',
		defaults: {
			name: 'Google Ads Conversion',
		},
		// @ts-ignore - Compatibility with different n8n versions
		inputs: ['main'],
		// @ts-ignore - Compatibility with different n8n versions  
		outputs: ['main'],
		credentials: [
			{
				name: 'googleAdsOAuth2',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://googleads.googleapis.com/v17',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Upload Click Conversion',
						value: 'uploadClickConversion',
						description: 'Upload a click conversion to Google Ads',
						action: 'Upload a click conversion',
					},
				],
				default: 'uploadClickConversion',
			},

			// Account Type Detection
			{
				displayName: 'Account Type',
				name: 'accountType',
				type: 'options',
				options: [
					{
						name: 'Regular Google Ads Account',
						value: 'regular',
						description: 'Direct Google Ads account (not a manager account)',
					},
					{
						name: 'Manager Account (MCC)',
						value: 'manager',
						description: 'Manager account that manages multiple client accounts',
					},
				],
				default: 'regular',
				description: 'Select your account type',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Managed Account',
				name: 'managedAccount',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select the managed account to upload conversions to',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a managed account...',
						typeOptions: {
							searchListMethod: 'getManagedAccounts',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[0-9]+$',
									errorMessage: 'Customer ID must contain only numbers',
								},
							},
						],
						placeholder: '1234567890',
					},
				],
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						accountType: ['manager'],
					},
				},
			},

			// Conversion Data Section
			{
				displayName: 'Conversion Data',
				name: 'conversionDataSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Conversion Action ID',
				name: 'conversionAction',
				type: 'string',
				required: true,
				default: '',
				description: 'The conversion action resource name or ID from Google Ads',
				hint: 'Found in Google Ads under Tools & Settings > Conversions',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Conversion Date Time',
				name: 'conversionDateTime',
				type: 'string',
				required: true,
				default: '={{$now}}',
				description: 'The date and time of the conversion. Accepts DateTime objects (like $now) or strings in YYYY-MM-DD HH:MM:SS+TZ format',
				hint: 'Example: 2024-01-15 14:30:00+00:00 or use {{$now}} for current time',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Conversion Value',
				name: 'conversionValue',
				type: 'number',
				default: 0,
				description: 'The value of the conversion (optional)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Currency Code',
				name: 'currencyCode',
				type: 'string',
				default: 'USD',
				description: 'Three-letter ISO 4217 currency code',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				default: '',
				description: 'Unique transaction/order identifier (optional but recommended)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},

			// User Identification Section
			{
				displayName: 'User Identification',
				name: 'userIdentificationSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Identification Method',
				name: 'identificationMethod',
				type: 'options',
				options: [
					{
						name: 'GCLID (Google Click ID)',
						value: 'gclid',
						description: 'Use Google Click ID for identification',
					},
					{
						name: 'GBRAID (iOS App Install)',
						value: 'gbraid',
						description: 'Use GBRAID for iOS app install conversions',
					},
					{
						name: 'WBRAID (iOS Web-to-App)',
						value: 'wbraid', 
						description: 'Use WBRAID for iOS web-to-app conversions',
					},
					{
						name: 'Enhanced Conversions',
						value: 'enhanced',
						description: 'Use hashed user data for enhanced conversions',
					},
				],
				default: 'gclid',
				description: 'Select the method to identify the user who converted',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'GCLID',
				name: 'gclid',
				type: 'string',
				required: true,
				default: '',
				description: 'The Google Click ID from the ad click',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['gclid'],
					},
				},
			},
			{
				displayName: 'GBRAID',
				name: 'gbraid',
				type: 'string',
				required: true,
				default: '',
				description: 'The GBRAID for iOS app install conversions',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['gbraid'],
					},
				},
			},
			{
				displayName: 'WBRAID',
				name: 'wbraid',
				type: 'string',
				required: true,
				default: '',
				description: 'The WBRAID for iOS web-to-app conversions',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['wbraid'],
					},
				},
			},

			// Enhanced Conversions Section
			{
				displayName: 'Enhanced Conversion Data',
				name: 'enhancedConversionSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Email Address',
				name: 'email',
				type: 'string',
				default: '',
				description: 'User email address (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'User phone number in E.164 format (will be automatically hashed)',
				hint: 'Example: +1234567890',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'User first name (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'User last name (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description: 'User street address (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'User city (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'State/Region',
				name: 'state',
				type: 'string',
				default: '',
				description: 'User state or region (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'User postal/ZIP code (will be automatically hashed)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},
			{
				displayName: 'Country Code',
				name: 'countryCode',
				type: 'string',
				default: '',
				description: 'Two-letter ISO 3166-1 alpha-2 country code (will be automatically hashed)',
				hint: 'Example: US, GB, DE',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						identificationMethod: ['enhanced'],
					},
				},
			},

			// Privacy Compliance Section
			{
				displayName: 'Privacy Compliance (EEA)',
				name: 'privacySection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Ad User Data Consent',
				name: 'adUserDataConsent',
				type: 'options',
				options: [
					{
						name: 'Granted',
						value: 'GRANTED',
						description: 'User has consented to ad user data usage',
					},
					{
						name: 'Denied',
						value: 'DENIED',
						description: 'User has denied consent for ad user data usage',
					},
					{
						name: 'Unknown',
						value: 'UNKNOWN',
						description: 'Consent status is unknown',
					},
				],
				default: 'UNKNOWN',
				description: 'User consent for ad user data usage (required for EEA)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Ad Personalization Consent',
				name: 'adPersonalizationConsent',
				type: 'options',
				options: [
					{
						name: 'Granted',
						value: 'GRANTED',
						description: 'User has consented to ad personalization',
					},
					{
						name: 'Denied',
						value: 'DENIED',
						description: 'User has denied consent for ad personalization',
					},
					{
						name: 'Unknown',
						value: 'UNKNOWN',
						description: 'Consent status is unknown',
					},
				],
				default: 'UNKNOWN',
				description: 'User consent for ad personalization (required for EEA)',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},

			// Debug Section
			{
				displayName: 'Advanced Options',
				name: 'advancedSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Validate Only',
				name: 'validateOnly',
				type: 'boolean',
				default: false,
				description: 'Only validate the conversion data without actually uploading',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Debug Mode',
				name: 'debugMode',
				type: 'boolean',
				default: false,
				description: 'Enable debug mode for detailed logging and response data',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},

			// Testing & Debug Section
			{
				displayName: 'Batch Processing',
				name: 'batchProcessingSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Enable Batch Processing',
				name: 'enableBatchProcessing',
				type: 'boolean',
				default: false,
				description: 'Process multiple conversions in batches for better performance',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				description: 'Number of conversions to process in each batch (max 2000)',
				typeOptions: {
					minValue: 1,
					maxValue: 2000,
				},
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						enableBatchProcessing: [true],
					},
				},
			},
			{
				displayName: 'Batch Processing Mode',
				name: 'batchProcessingMode',
				type: 'options',
				options: [
					{
						name: 'Fail on First Error',
						value: 'failFast',
						description: 'Stop processing if any batch fails',
					},
					{
						name: 'Continue on Errors',
						value: 'continueOnError',
						description: 'Continue processing even if some batches fail',
					},
					{
						name: 'Partial Failure Mode',
						value: 'partialFailure',
						description: 'Use Google Ads partial failure policy (recommended)',
					},
				],
				default: 'partialFailure',
				description: 'How to handle errors during batch processing',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						enableBatchProcessing: [true],
					},
				},
			},
			{
				displayName: 'Show Progress',
				name: 'showProgress',
				type: 'boolean',
				default: true,
				description: 'Log batch processing progress',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
						enableBatchProcessing: [true],
					},
				},
			},

			// Testing & Debug Section (existing)
			{
				displayName: 'Testing & Debug',
				name: 'testingSection',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['uploadClickConversion'],
					},
				},
			},
		],
	};

	methods = {
		listSearch: {
			async getManagedAccounts(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				try {
					// Get credentials and developer token from authentication
					const credentials = await this.getCredentials('googleAdsOAuth2');
					
					// Get manager account info first
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'googleAdsOAuth2',
						{
							method: 'POST',
							url: '/googleAds:search',
							body: {
								query: `
									SELECT 
										customer_client.client_customer,
										customer_client.descriptive_name,
										customer_client.currency_code,
										customer_client.time_zone,
										customer_client.status
									FROM customer_client 
									WHERE customer_client.status = 'ENABLED'
								`,
								pageSize: 1000,
							},
							headers: {
								'developer-token': credentials.developerToken as string,
								'login-customer-id': credentials.customerId as string,
								'Accept': 'application/json',
								'Content-Type': 'application/json',
							},
						}
					);

					const results: INodeListSearchItems[] = [];
					
					if (response.results && Array.isArray(response.results)) {
						for (const result of response.results) {
							const client = result.customerClient;
							if (client && client.clientCustomer) {
								const customerId = client.clientCustomer.replace('customers/', '');
								const name = client.descriptiveName || `Account ${customerId}`;
								const currency = client.currencyCode || '';
								const timezone = client.timeZone || '';
								
								results.push({
									name: `${name} (${customerId})${currency ? ` - ${currency}` : ''}${timezone ? ` - ${timezone}` : ''}`,
									value: customerId,
								});
							}
						}
					}

					return {
						results: results.sort((a, b) => a.name.localeCompare(b.name)),
					};

				} catch (error: any) {
					throw new GoogleAdsApiError(
						this.getNode(),
						`Failed to load managed accounts: ${error.message}`,
						error.httpCode || 500,
						error.code
					);
				}
			},
		},
	};

	/**
	 * Sleep utility for retry delays
	 */
	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Retry configuration interface
	 */
	private getRetryConfig(): {
		maxRetries: number;
		baseDelayMs: number;
		maxDelayMs: number;
		retryableStatusCodes: number[];
		retryableErrors: string[];
	} {
		return {
			maxRetries: 3,
			baseDelayMs: 1000, // 1 second
			maxDelayMs: 30000, // 30 seconds
			retryableStatusCodes: [429, 500, 502, 503, 504],
			retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
		};
	}

	/**
	 * Determine if an error should trigger a retry
	 */
	private shouldRetry(error: any, retryAttempt: number, config: any): boolean {
		// Check if we've exceeded max retries
		if (retryAttempt >= config.maxRetries) {
			return false;
		}

		// Check for specific retryable HTTP status codes
		const httpCode = error.httpCode || error.status || 0;
		if (config.retryableStatusCodes.includes(httpCode)) {
			return true;
		}

		// Check for specific network errors
		const errorCode = error.code || error.errno || '';
		if (config.retryableErrors.includes(errorCode)) {
			return true;
		}

		// Check for specific error types that should be retried
		if (error instanceof GoogleAdsRateLimitError) {
			return true;
		}

		// Don't retry authentication or validation errors
		if (error instanceof GoogleAdsAuthenticationError || error instanceof GoogleAdsValidationError) {
			return false;
		}

		// Retry server errors (5xx) but not client errors (4xx)
		if (httpCode >= 500) {
			return true;
		}

		return false;
	}

	/**
	 * Calculate delay for exponential backoff
	 */
	private calculateDelay(retryAttempt: number, config: any, retryAfter?: number): number {
		// If rate limit error provides retry-after header, respect it
		if (retryAfter && retryAfter > 0) {
			return Math.min(retryAfter * 1000, config.maxDelayMs);
		}

		// Exponential backoff: baseDelay * (2 ^ retryAttempt) + jitter
		const exponentialDelay = config.baseDelayMs * Math.pow(2, retryAttempt);
		
		// Add jitter to prevent thundering herd (±25% random variation)
		const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
		const delayWithJitter = exponentialDelay + jitter;

		// Cap at maximum delay
		return Math.min(Math.max(delayWithJitter, config.baseDelayMs), config.maxDelayMs);
	}

	/**
	 * Execute function with retry logic
	 */
	private async executeWithRetry<T>(
		executeFunctions: IExecuteFunctions,
		operation: () => Promise<T>,
		context: string,
		debugMode: boolean = false
	): Promise<T> {
		const config = this.getRetryConfig();
		let lastError: any;

		for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
			try {
				if (debugMode && attempt > 0) {
					executeFunctions.logger.debug(`${context}: Retry attempt ${attempt}/${config.maxRetries}`);
				}

				const result = await operation();
				
				if (debugMode && attempt > 0) {
					executeFunctions.logger.debug(`${context}: Retry successful on attempt ${attempt}`);
				}

				return result;

			} catch (error) {
				lastError = error;

				// Parse the error using our error handling system
				const parsedError = this.parseApiError(error, executeFunctions);

				// Check if we should retry this error
				if (!this.shouldRetry(error, attempt, config)) {
					if (debugMode) {
						executeFunctions.logger.debug(`${context}: Error not retryable`, {
							error: parsedError.message,
							errorType: parsedError.name,
							attempt,
							httpCode: error.httpCode || error.status,
						});
					}
					throw parsedError;
				}

				// If this is our last attempt, throw the error
				if (attempt === config.maxRetries) {
					if (debugMode) {
						executeFunctions.logger.debug(`${context}: Max retries exceeded`, {
							error: parsedError.message,
							errorType: parsedError.name,
							maxRetries: config.maxRetries,
						});
					}
					throw parsedError;
				}

				// Calculate delay for next attempt
				const retryAfter = (parsedError as any).retryAfter;
				const delay = this.calculateDelay(attempt, config, retryAfter);

				if (debugMode) {
					executeFunctions.logger.debug(`${context}: Retrying after delay`, {
						error: parsedError.message,
						errorType: parsedError.name,
						attempt: attempt + 1,
						maxRetries: config.maxRetries,
						delayMs: delay,
						retryAfter: retryAfter,
					});
				}

				// Wait before retrying
				await this.sleep(delay);
			}
		}

		// This should never be reached, but just in case
		throw lastError;
	}

	/**
	 * Parse and categorize Google Ads API errors
	 */
	private parseApiError(error: any, executeFunctions: IExecuteFunctions): Error {
		const httpCode = error.httpCode || error.status || 0;
		const message = error.message || 'Unknown error occurred';
		const responseBody = error.response?.body || error.body;

		// Check for URL-related errors first
		if (message.includes('ERR_INVALID_URL') || message.includes('Invalid URL')) {
			executeFunctions.logger.error('URL validation error:', {
				message,
				stack: error.stack,
			});
			return new GoogleAdsApiError(
				executeFunctions.getNode(),
				`Invalid URL: ${message}. Please check your customer ID format and ensure it contains only valid characters.`,
				400,
				'ERR_INVALID_URL'
			);
		}

		// Log full error details in debug mode
		executeFunctions.logger.debug('Google Ads API Error Details:', {
			httpCode,
			message,
			responseBody,
			stack: error.stack,
		});

		// Parse Google Ads specific error details if available
		let apiErrorCode: string | undefined;
		let detailedMessage = message;

		if (responseBody) {
			try {
				const errorData = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
				
				// Extract Google Ads error details
				if (errorData.error) {
					apiErrorCode = errorData.error.code;
					detailedMessage = errorData.error.message || message;
					
					// Handle specific Google Ads error types
					if (errorData.error.details) {
						const details = Array.isArray(errorData.error.details) ? errorData.error.details : [errorData.error.details];
						const errorDetails = details.map((detail: any) => detail.message || detail).join('; ');
						detailedMessage += ` Details: ${errorDetails}`;
					}
				}
			} catch (parseError) {
				executeFunctions.logger.debug('Failed to parse error response body:', parseError);
			}
		}

		// Categorize errors based on HTTP status codes
		switch (httpCode) {
			case 400:
				return new GoogleAdsValidationError(
					executeFunctions.getNode(),
					`Invalid request parameters. ${detailedMessage}. Please check your conversion data, identifiers, and format.`
				);

			case 401:
				return new GoogleAdsAuthenticationError(
					executeFunctions.getNode(),
					`Authentication failed. ${detailedMessage}. Please verify your OAuth2 credentials and developer token.`
				);

			case 403:
				return new GoogleAdsAuthenticationError(
					executeFunctions.getNode(),
					`Access denied. ${detailedMessage}. Please verify your developer token permissions and customer ID access.`
				);

			case 404:
				return new GoogleAdsValidationError(
					executeFunctions.getNode(),
					`Resource not found. ${detailedMessage}. Please check your conversion action ID and customer ID.`
				);

			case 429:
				// Extract retry-after header if available
				const retryAfter = error.response?.headers?.['retry-after'] ? 
					parseInt(error.response.headers['retry-after']) : undefined;
				
				return new GoogleAdsRateLimitError(
					executeFunctions.getNode(),
					`Rate limit exceeded. ${detailedMessage}. Please implement retry logic or reduce request frequency.`,
					retryAfter
				);

			case 500:
			case 502:
			case 503:
			case 504:
				return new GoogleAdsApiError(
					executeFunctions.getNode(),
					`Google Ads API server error (${httpCode}). ${detailedMessage}. Please try again later.`,
					httpCode,
					apiErrorCode
				);

			default:
				return new GoogleAdsApiError(
					executeFunctions.getNode(),
					`Unexpected error (${httpCode}): ${detailedMessage}`,
					httpCode,
					apiErrorCode
				);
		}
	}

	/**
	 * Convert n8n DateTime objects or strings to ISO string format
	 */
	private convertDateTimeToString(dateTimeValue: any): string {
		if (!dateTimeValue) {
			return '';
		}

		// Handle n8n DateTime objects
		if (typeof dateTimeValue === 'object') {
			// Check if it's a Date object
			if (dateTimeValue instanceof Date) {
				return dateTimeValue.toISOString();
			}
			// Check if it has a toString method (n8n DateTime objects)
			if (dateTimeValue.toString && typeof dateTimeValue.toString === 'function') {
				return dateTimeValue.toString();
			}
			// Check if it has toISOString method
			if (dateTimeValue.toISOString && typeof dateTimeValue.toISOString === 'function') {
				return dateTimeValue.toISOString();
			}
		}

		// Handle strings and numbers (timestamps)
		if (typeof dateTimeValue === 'string') {
			return dateTimeValue;
		}

		if (typeof dateTimeValue === 'number') {
			return new Date(dateTimeValue).toISOString();
		}

		// Fallback: try to convert to string
		return String(dateTimeValue);
	}

	/**
	 * Validate input parameters before making API calls
	 */
	private validateInputParameters(executeFunctions: IExecuteFunctions, itemIndex: number): void {
		const identificationMethod = executeFunctions.getNodeParameter('identificationMethod', itemIndex) as string;
		const conversionAction = executeFunctions.getNodeParameter('conversionAction', itemIndex) as string;
		const conversionDateTimeRaw = executeFunctions.getNodeParameter('conversionDateTime', itemIndex);

		// Convert DateTime objects from n8n to string
		const conversionDateTime = this.convertDateTimeToString(conversionDateTimeRaw);

		// Validate required fields
		if (!conversionAction || conversionAction.trim() === '') {
			throw new GoogleAdsValidationError(
				executeFunctions.getNode(),
				'Conversion Action ID is required',
				'conversionAction'
			);
		}

		if (!conversionDateTime || conversionDateTime.trim() === '') {
			throw new GoogleAdsValidationError(
				executeFunctions.getNode(),
				'Conversion Date Time is required',
				'conversionDateTime'
			);
		}

		// Validate identification method specific requirements
		switch (identificationMethod) {
			case 'gclid':
				const gclid = executeFunctions.getNodeParameter('gclid', itemIndex, '') as string;
				if (!gclid || gclid.trim() === '') {
					throw new GoogleAdsValidationError(
						executeFunctions.getNode(),
						'GCLID is required when using GCLID identification method',
						'gclid'
					);
				}
				break;

			case 'gbraid':
				const gbraid = executeFunctions.getNodeParameter('gbraid', itemIndex, '') as string;
				if (!gbraid || gbraid.trim() === '') {
					throw new GoogleAdsValidationError(
						executeFunctions.getNode(),
						'GBRAID is required when using GBRAID identification method',
						'gbraid'
					);
				}
				break;

			case 'wbraid':
				const wbraid = executeFunctions.getNodeParameter('wbraid', itemIndex, '') as string;
				if (!wbraid || wbraid.trim() === '') {
					throw new GoogleAdsValidationError(
						executeFunctions.getNode(),
						'WBRAID is required when using WBRAID identification method',
						'wbraid'
					);
				}
				break;

			case 'enhanced':
				// For enhanced conversions, at least one identifier must be provided
				const email = executeFunctions.getNodeParameter('email', itemIndex, '') as string;
				const phoneNumber = executeFunctions.getNodeParameter('phoneNumber', itemIndex, '') as string;
				const firstName = executeFunctions.getNodeParameter('firstName', itemIndex, '') as string;
				const lastName = executeFunctions.getNodeParameter('lastName', itemIndex, '') as string;
				const streetAddress = executeFunctions.getNodeParameter('streetAddress', itemIndex, '') as string;
				
				const hasUserData = [email, phoneNumber, firstName, lastName, streetAddress]
					.some(field => field && field.trim() !== '');

				if (!hasUserData) {
					throw new GoogleAdsValidationError(
						executeFunctions.getNode(),
						'At least one user identifier (email, phone, or address info) is required for enhanced conversions',
						'userIdentifiers'
					);
				}
				break;

			default:
				throw new GoogleAdsValidationError(
					executeFunctions.getNode(),
					`Unsupported identification method: ${identificationMethod}`,
					'identificationMethod'
				);
		}

		// Validate date time format (basic check)
		try {
			const date = new Date(conversionDateTime);
			if (isNaN(date.getTime())) {
				throw new Error('Invalid date');
			}
		} catch (dateError) {
			throw new GoogleAdsValidationError(
				executeFunctions.getNode(),
				'Invalid conversion date time format. Please use YYYY-MM-DD HH:MM:SS+TZ format (e.g., 2024-01-15 14:30:00+00:00)',
				'conversionDateTime'
			);
		}
	}

	/**
	 * Get authenticated headers for Google Ads API
	 */
	private async getAuthenticatedHeaders(executeFunctions: IExecuteFunctions): Promise<Record<string, string>> {
		try {
			// Get OAuth2 credentials from n8n credential system
			const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
			
			if (!credentials) {
				throw new GoogleAdsAuthenticationError(executeFunctions.getNode(), 'No credentials provided for Google Ads OAuth2');
			}

			// Extract credential values
			const developerToken = credentials.developerToken as string;
			const credentialCustomerId = credentials.customerId as string;

			if (!developerToken || !credentialCustomerId) {
				throw new GoogleAdsAuthenticationError(executeFunctions.getNode(), 'Missing required credentials: developer token and customer ID must be provided');
			}

			// For manager accounts, use the manager account ID as login-customer-id
			// For regular accounts, use the same customer ID for both
			const accountType = executeFunctions.getNodeParameter('accountType', 0, 'regular') as string;
			const loginCustomerId = credentialCustomerId; // Always use the authenticated account ID as login customer

			// Return headers required for Google Ads API authentication
			return {
				'developer-token': developerToken,
				'login-customer-id': loginCustomerId.replace(/\D/g, ''), // Sanitize the login customer ID
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			};
		} catch (error) {
			if (error instanceof GoogleAdsAuthenticationError) {
				throw error;
			}
			throw new GoogleAdsAuthenticationError(executeFunctions.getNode(), `Failed to setup authentication: ${(error as Error).message}`);
		}
	}

	/**
	 * Validate credentials and test API connectivity with retry
	 */
	private async validateCredentials(executeFunctions: IExecuteFunctions, headers: Record<string, string>): Promise<void> {
		const debugMode = executeFunctions.getNodeParameter('debugMode', 0, false) as boolean;

		// Get customer ID for validation
		let customerId;
		try {
			customerId = await this.getCustomerId(executeFunctions);
		} catch (error) {
			executeFunctions.logger.error('Failed to get valid customer ID during credential validation:', error);
			throw error;
		}

		// Construct and validate the URL
		const apiEndpoint = `/customers/${customerId}/googleAds:search`;
		const baseUrl = 'https://googleads.googleapis.com/v17';
		
		// Validate URL before making the request
		if (!this.validateUrl(baseUrl, apiEndpoint, executeFunctions)) {
			throw new GoogleAdsApiError(
				executeFunctions.getNode(),
				`Invalid URL constructed for credential validation. Please check your customer ID format.`,
				400,
				'ERR_INVALID_URL'
			);
		}

		await this.executeWithRetry(
			executeFunctions,
			async () => {
				// Simple test query to validate credentials
				const testPayload = {
					query: 'SELECT customer.id FROM customer LIMIT 1',
				};

				return await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleAdsOAuth2',
					{
						method: 'POST',
						url: apiEndpoint,
						body: testPayload,
						headers,
						// Add timeout and error handling options
						timeout: 30000, // 30 seconds timeout
						ignoreHttpStatusErrors: false, // Don't ignore HTTP errors
					}
				);
			},
			'Credential Validation',
			debugMode
		);
	}

	/**
	 * Validate a URL to ensure it's properly formatted
	 */
	private validateUrl(baseUrl: string, path: string, executeFunctions: IExecuteFunctions): boolean {
		try {
			// Validate base URL format
			if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.startsWith('http')) {
				executeFunctions.logger.error('Invalid base URL format:', { baseUrl });
				return false;
			}

			// Validate path format
			if (!path || typeof path !== 'string') {
				executeFunctions.logger.error('Invalid path format:', { path });
				return false;
			}

			// Check for required path components for customer ID
			if (path.includes('/customers/') && !path.match(/\/customers\/\d+/)) {
				executeFunctions.logger.error('Invalid customer ID in path:', { path });
				return false;
			}

			// Attempt to construct a URL object to validate
			const url = new URL(path, baseUrl);
			
			// Additional validation on the constructed URL
			if (!url.href || url.href === baseUrl + '/') {
				executeFunctions.logger.error('URL construction resulted in invalid URL:', {
					baseUrl, path, constructedUrl: url.href
				});
				return false;
			}
			
			executeFunctions.logger.debug('URL validation successful:', {
				baseUrl, path, constructedUrl: url.href
			});
			return true;
		} catch (error) {
			executeFunctions.logger.error('URL validation failed:', {
				baseUrl,
				path,
				error: (error as Error).message
			});
			return false;
		}
	}

	/**
	 * Hash a string using SHA-256 for enhanced conversions
	 */
	private async hashString(input: string): Promise<string> {
		if (!input || input.trim() === '') {
			return '';
		}
		
		// Normalize the input (lowercase and trim)
		const normalized = input.toLowerCase().trim();
		
		// Use Node.js crypto to create SHA-256 hash
		return createHash('sha256').update(normalized, 'utf8').digest('hex');
	}

	/**
	 * Build user identifier data for enhanced conversions
	 */
	private async buildUserIdentifiers(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<any[]> {
		const userIdentifiers: any[] = [];

		// Get enhanced conversion data
		const email = executeFunctions.getNodeParameter('email', itemIndex, '') as string;
		const phoneNumber = executeFunctions.getNodeParameter('phoneNumber', itemIndex, '') as string;
		const firstName = executeFunctions.getNodeParameter('firstName', itemIndex, '') as string;
		const lastName = executeFunctions.getNodeParameter('lastName', itemIndex, '') as string;
		const streetAddress = executeFunctions.getNodeParameter('streetAddress', itemIndex, '') as string;
		const city = executeFunctions.getNodeParameter('city', itemIndex, '') as string;
		const state = executeFunctions.getNodeParameter('state', itemIndex, '') as string;
		const postalCode = executeFunctions.getNodeParameter('postalCode', itemIndex, '') as string;
		const countryCode = executeFunctions.getNodeParameter('countryCode', itemIndex, '') as string;

		// Add email identifier
		if (email) {
			userIdentifiers.push({
				hashedEmail: await this.hashString(email),
			});
		}

		// Add phone identifier
		if (phoneNumber) {
			userIdentifiers.push({
				hashedPhoneNumber: await this.hashString(phoneNumber),
			});
		}

		// Add address identifier if we have enough information
		if (firstName || lastName || streetAddress || city || state || postalCode || countryCode) {
			const addressInfo: any = {};
			
			if (firstName) addressInfo.hashedFirstName = await this.hashString(firstName);
			if (lastName) addressInfo.hashedLastName = await this.hashString(lastName);
			if (streetAddress) addressInfo.hashedStreetAddress = await this.hashString(streetAddress);
			if (city) addressInfo.hashedCity = await this.hashString(city);
			if (state) addressInfo.hashedState = await this.hashString(state);
			if (postalCode) addressInfo.hashedPostalCode = await this.hashString(postalCode);
			if (countryCode) addressInfo.countryCode = countryCode.toUpperCase();

			userIdentifiers.push({ addressInfo });
		}

		return userIdentifiers;
	}

	/**
	 * Build conversion payload for Google Ads API
	 */
	private async buildConversionPayload(executeFunctions: IExecuteFunctions, itemIndex: number): Promise<any> {
		const identificationMethod = executeFunctions.getNodeParameter('identificationMethod', itemIndex) as string;
		const conversionAction = executeFunctions.getNodeParameter('conversionAction', itemIndex) as string;
		const conversionDateTimeRaw = executeFunctions.getNodeParameter('conversionDateTime', itemIndex);
		const conversionValue = executeFunctions.getNodeParameter('conversionValue', itemIndex, 0) as number;
		const currencyCode = executeFunctions.getNodeParameter('currencyCode', itemIndex, 'USD') as string;
		const orderId = executeFunctions.getNodeParameter('orderId', itemIndex, '') as string;
		const adUserDataConsent = executeFunctions.getNodeParameter('adUserDataConsent', itemIndex, 'UNKNOWN') as string;
		const adPersonalizationConsent = executeFunctions.getNodeParameter('adPersonalizationConsent', itemIndex, 'UNKNOWN') as string;
		const debugMode = executeFunctions.getNodeParameter('debugMode', itemIndex, false) as boolean;

		// Convert DateTime objects from n8n to string
		const conversionDateTime = this.convertDateTimeToString(conversionDateTimeRaw);

		// Validate conversion action
		if (!conversionAction) {
			throw new GoogleAdsValidationError(
				executeFunctions.getNode(),
				'Conversion Action ID is required',
				'conversionAction'
			);
		}

		// Get customer ID for building the conversion action resource name
		const customerId = await this.getCustomerId(executeFunctions);

		// Format conversion action resource name
		let formattedConversionAction: string;
		
		// Log the original conversion action ID for debugging
		if (debugMode) {
			executeFunctions.logger.debug('Original Conversion Action ID:', { conversionAction });
		}
		
		// Check if it's already a fully qualified resource name
		if (conversionAction.startsWith('customers/')) {
			// Validate the format of the fully qualified resource name
			const resourceNamePattern = /^customers\/\d+\/conversionActions\/\w+$/;
			if (!resourceNamePattern.test(conversionAction)) {
				throw new GoogleAdsValidationError(
					executeFunctions.getNode(),
					`Invalid conversion action resource name format: ${conversionAction}. Expected format: customers/{customer_id}/conversionActions/{conversion_action_id}`,
					'conversionAction'
				);
			}
			formattedConversionAction = conversionAction;
			
			if (debugMode) {
				executeFunctions.logger.debug('Using fully qualified conversion action resource name:', { formattedConversionAction });
			}
		} else {
			// Validate the conversion action ID format before sanitizing
			if (!/^[\w\-]+$/.test(conversionAction)) {
				executeFunctions.logger.warn('Conversion Action ID contains potentially invalid characters:', {
					conversionAction,
					recommendation: 'Use only alphanumeric characters, underscores, and hyphens for conversion action IDs'
				});
			}
			
			// Remove any non-alphanumeric characters except for underscores and hyphens from the conversion action ID
			const sanitizedConversionAction = conversionAction.replace(/[^\w\-]/g, '');
			
			if (sanitizedConversionAction !== conversionAction) {
				executeFunctions.logger.warn('Conversion Action ID was sanitized:', {
					original: conversionAction,
					sanitized: sanitizedConversionAction
				});
			}
			
			if (!sanitizedConversionAction) {
				throw new GoogleAdsValidationError(
					executeFunctions.getNode(),
					'Conversion Action ID contains no valid characters',
					'conversionAction'
				);
			}
			
			// Construct the fully qualified resource name
			formattedConversionAction = `customers/${customerId}/conversionActions/${sanitizedConversionAction}`;
			
			if (debugMode) {
				executeFunctions.logger.debug('Constructed conversion action resource name:', {
					customerId,
					sanitizedConversionAction,
					formattedConversionAction
				});
			}
		}

		// Base conversion object
		const conversion: any = {
			conversionAction: formattedConversionAction,
			conversionDateTime: conversionDateTime,
		};

		// Add conversion value if provided
		if (conversionValue > 0) {
			conversion.conversionValue = conversionValue;
			conversion.currencyCode = currencyCode;
		}

		// Add order ID if provided
		if (orderId) {
			conversion.orderId = orderId;
		}

		// Add consent information for EEA compliance
		if (adUserDataConsent !== 'UNKNOWN' || adPersonalizationConsent !== 'UNKNOWN') {
			conversion.consent = {};
			if (adUserDataConsent !== 'UNKNOWN') {
				conversion.consent.adUserData = adUserDataConsent;
			}
			if (adPersonalizationConsent !== 'UNKNOWN') {
				conversion.consent.adPersonalization = adPersonalizationConsent;
			}
		}

		// Handle different identification methods
		switch (identificationMethod) {
			case 'gclid':
				const gclid = executeFunctions.getNodeParameter('gclid', itemIndex) as string;
				if (!gclid) {
					throw new NodeOperationError(executeFunctions.getNode(), 'GCLID is required when using GCLID identification method');
				}
				conversion.gclid = gclid;
				break;

			case 'gbraid':
				const gbraid = executeFunctions.getNodeParameter('gbraid', itemIndex) as string;
				if (!gbraid) {
					throw new NodeOperationError(executeFunctions.getNode(), 'GBRAID is required when using GBRAID identification method');
				}
				conversion.gbraid = gbraid;
				break;

			case 'wbraid':
				const wbraid = executeFunctions.getNodeParameter('wbraid', itemIndex) as string;
				if (!wbraid) {
					throw new NodeOperationError(executeFunctions.getNode(), 'WBRAID is required when using WBRAID identification method');
				}
				conversion.wbraid = wbraid;
				break;

			case 'enhanced':
				const userIdentifiers = await this.buildUserIdentifiers(executeFunctions, itemIndex);
				if (userIdentifiers.length === 0) {
					throw new NodeOperationError(executeFunctions.getNode(), 'At least one user identifier (email, phone, or address info) is required for enhanced conversions');
				}
				conversion.userIdentifiers = userIdentifiers;
				break;

			default:
				throw new NodeOperationError(executeFunctions.getNode(), `Unsupported identification method: ${identificationMethod}`);
		}

		return conversion;
	}

	/**
	 * Get customer ID from credentials or managed account selection
	 */
	private async getCustomerId(executeFunctions: IExecuteFunctions): Promise<string> {
		const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
		const accountType = executeFunctions.getNodeParameter('accountType', 0, 'regular') as string;
		const debugMode = executeFunctions.getNodeParameter('debugMode', 0, false) as boolean;
		
		let customerId: string;
		
		if (accountType === 'manager') {
			// For manager accounts, use the selected managed account
			const managedAccount = executeFunctions.getNodeParameter('managedAccount', 0) as any;
			
			if (typeof managedAccount === 'object' && managedAccount.value) {
				customerId = managedAccount.value;
			} else if (typeof managedAccount === 'string') {
				customerId = managedAccount;
			} else {
				throw new GoogleAdsAuthenticationError(
					executeFunctions.getNode(),
					'Managed account must be selected when using manager account type'
				);
			}
			
			if (debugMode) {
				executeFunctions.logger.debug('Using managed account ID:', { 
					managedAccountId: customerId,
					managerAccountId: credentials.customerId 
				});
			}
		} else {
			// For regular accounts, use the credential's customer ID
			customerId = credentials.customerId as string;
			
			if (debugMode) {
				executeFunctions.logger.debug('Using regular account ID:', { customerId });
			}
		}
		
		// Validate customer ID exists
		if (!customerId) {
			throw new GoogleAdsAuthenticationError(
				executeFunctions.getNode(),
				accountType === 'manager' 
					? 'Managed account ID is missing or not selected'
					: 'Customer ID is missing in credentials'
			);
		}
		
		// Remove any non-digit characters to ensure valid format
		const sanitizedCustomerId = customerId.replace(/\D/g, '');
		
		// Validate that we have digits after sanitization
		if (!sanitizedCustomerId) {
			throw new GoogleAdsAuthenticationError(
				executeFunctions.getNode(),
				'Customer ID contains no valid digits'
			);
		}
		
		// Validate the length of the customer ID (Google Ads customer IDs are typically 10 digits)
		if (sanitizedCustomerId.length < 8 || sanitizedCustomerId.length > 12) {
			executeFunctions.logger.warn(
				'Customer ID length is unusual. Google Ads customer IDs are typically 10 digits.',
				{ sanitizedCustomerId, length: sanitizedCustomerId.length }
			);
		}
		
		if (debugMode) {
			executeFunctions.logger.debug('Final Customer ID for conversions:', { 
				sanitizedCustomerId,
				accountType 
			});
		}
		
		return sanitizedCustomerId;
	}

	/**
	 * Execute conversion upload to Google Ads API with retry logic
	 */
	private async uploadConversion(executeFunctions: IExecuteFunctions, conversion: any, itemIndex: number): Promise<any> {
		const validateOnly = executeFunctions.getNodeParameter('validateOnly', itemIndex, false) as boolean;
		const debugMode = executeFunctions.getNodeParameter('debugMode', itemIndex, false) as boolean;

		// Get and validate customer ID
		let customerId;
		try {
			customerId = await this.getCustomerId(executeFunctions);
		} catch (error) {
			executeFunctions.logger.error('Failed to get valid customer ID:', error);
			throw error;
		}

		// Build the request payload
		const requestPayload = {
			conversions: [conversion],
			partialFailurePolicy: {
				partialFailureEnabled: true,
			},
			validateOnly: validateOnly,
		};

		if (debugMode) {
			executeFunctions.logger.debug('Google Ads Conversion API Request Payload:', {
				payload: requestPayload,
				customerId
			});
		}

		// Construct and validate the URL
		const baseUrl = 'https://googleads.googleapis.com/v17';
		
		// Validate customer ID format before constructing the URL
		if (!customerId || !/^\d+$/.test(customerId)) {
			throw new GoogleAdsApiError(
				executeFunctions.getNode(),
				`Invalid customer ID format: ${customerId}. Must contain only digits.`,
				400,
				'ERR_INVALID_CUSTOMER_ID'
			);
		}
		
		const apiEndpoint = `/customers/${customerId}:uploadClickConversions`;
		
		// Log the URL components for debugging
		if (debugMode) {
			executeFunctions.logger.debug('URL Components:', {
				baseUrl,
				apiEndpoint,
				fullUrl: new URL(apiEndpoint, baseUrl).href
			});
		}
		
		// Validate URL before making the request
		if (!this.validateUrl(baseUrl, apiEndpoint, executeFunctions)) {
			throw new GoogleAdsApiError(
				executeFunctions.getNode(),
				`Invalid URL constructed for conversion upload. Base URL: ${baseUrl}, Path: ${apiEndpoint}. Please check your customer ID format.`,
				400,
				'ERR_INVALID_URL'
			);
		}

		return await this.executeWithRetry(
			executeFunctions,
			async () => {
				// Make the API call
				const response = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleAdsOAuth2',
					{
						method: 'POST',
						url: apiEndpoint,
						body: requestPayload,
						headers: await this.getAuthenticatedHeaders(executeFunctions),
						// Add timeout and error handling options
						timeout: 30000, // 30 seconds timeout
						ignoreHttpStatusErrors: false, // Don't ignore HTTP errors
					}
				);

				if (debugMode) {
					executeFunctions.logger.debug('Google Ads Conversion API Response:', { response });
				}

				return response;
			},
			`Conversion Upload (Item ${itemIndex + 1})`,
			debugMode
		);
	}

	/**
	 * Group conversions into batches based on batch size
	 */
	private groupIntoBatches<T>(items: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * Process a batch of conversions
	 */
	private async processBatch(
		executeFunctions: IExecuteFunctions,
		conversions: any[],
		batchIndex: number,
		totalBatches: number,
		batchProcessingMode: string,
		showProgress: boolean,
		debugMode: boolean
	): Promise<any> {
		const customerId = await this.getCustomerId(executeFunctions);
		const validateOnly = conversions.length > 0 && executeFunctions.getNodeParameter('validateOnly', 0, false) as boolean;

		if (showProgress && conversions.length > 0) {
			executeFunctions.logger.info(`Processing batch ${batchIndex + 1}/${totalBatches} with ${conversions.length} conversions`);
		}

		// Build the batch request payload
		const requestPayload = {
			conversions: conversions,
			partialFailurePolicy: {
				partialFailureEnabled: batchProcessingMode === 'partialFailure',
			},
			validateOnly: validateOnly,
		};

		if (debugMode) {
			executeFunctions.logger.debug(`Batch ${batchIndex + 1} Request Payload:`, { payload: requestPayload });
		}

		return await this.executeWithRetry(
			executeFunctions,
			async () => {
				// Validate customer ID format before constructing the URL
				if (!customerId || !/^\d+$/.test(customerId)) {
					throw new GoogleAdsApiError(
						executeFunctions.getNode(),
						`Invalid customer ID format: ${customerId}. Must contain only digits.`,
						400,
						'ERR_INVALID_CUSTOMER_ID'
					);
				}
				
				// Construct the API endpoint
				const apiEndpoint = `/customers/${customerId}:uploadClickConversions`;
				const baseUrl = 'https://googleads.googleapis.com/v17';
				
				// Log the URL components for debugging
				if (debugMode) {
					executeFunctions.logger.debug('Batch URL Components:', {
						baseUrl,
						apiEndpoint,
						fullUrl: new URL(apiEndpoint, baseUrl).href
					});
				}
				
				// Validate URL before making the request
				if (!this.validateUrl(baseUrl, apiEndpoint, executeFunctions)) {
					throw new GoogleAdsApiError(
						executeFunctions.getNode(),
						`Invalid URL constructed for batch conversion upload. Base URL: ${baseUrl}, Path: ${apiEndpoint}. Please check your customer ID format.`,
						400,
						'ERR_INVALID_URL'
					);
				}
				
				// Make the batch API call
				const response = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleAdsOAuth2',
					{
						method: 'POST',
						url: apiEndpoint,
						body: requestPayload,
						headers: await this.getAuthenticatedHeaders(executeFunctions),
						// Add timeout and error handling options
						timeout: 30000, // 30 seconds timeout
						ignoreHttpStatusErrors: false, // Don't ignore HTTP errors
					}
				);

				if (debugMode) {
					executeFunctions.logger.debug(`Batch ${batchIndex + 1} Response:`, { response });
				}

				return response;
			},
			`Batch ${batchIndex + 1}/${totalBatches} Upload`,
			debugMode
		);
	}

	/**
	 * Process all items using batch processing
	 */
	private async processBatchItems(executeFunctions: IExecuteFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
		const enableBatchProcessing = executeFunctions.getNodeParameter('enableBatchProcessing', 0, false) as boolean;
		const batchSize = executeFunctions.getNodeParameter('batchSize', 0, 100) as number;
		const batchProcessingMode = executeFunctions.getNodeParameter('batchProcessingMode', 0, 'partialFailure') as string;
		const showProgress = executeFunctions.getNodeParameter('showProgress', 0, true) as boolean;
		const debugMode = executeFunctions.getNodeParameter('debugMode', 0, false) as boolean;
		
		const returnData: INodeExecutionData[] = [];

		if (!enableBatchProcessing) {
			// Fall back to individual processing
			return await this.processIndividualItems(executeFunctions, items);
		}

		// Validate batch size
		const actualBatchSize = Math.min(Math.max(batchSize, 1), 2000);
		if (actualBatchSize !== batchSize) {
			executeFunctions.logger.warn(`Batch size adjusted from ${batchSize} to ${actualBatchSize} (must be between 1 and 2000)`);
		}

		if (showProgress) {
			executeFunctions.logger.info(`Starting batch processing: ${items.length} items, batch size: ${actualBatchSize}`);
		}

		// Build all conversions first
		const conversions: any[] = [];
		const itemIndexMap: number[] = []; // Track which item each conversion came from
		
		for (let i = 0; i < items.length; i++) {
			try {
				// Validate input parameters
				this.validateInputParameters(executeFunctions, i);
				
				// Build conversion payload from node parameters
				const conversion = await this.buildConversionPayload(executeFunctions, i);
				conversions.push(conversion);
				itemIndexMap.push(i);
				
			} catch (error) {
				if (batchProcessingMode === 'failFast') {
					throw error;
				}
				
				// Handle individual item errors in continue mode
				returnData.push({
					json: {
						success: false,
						error: (error as Error).message,
						errorType: (error as any).name || 'Unknown',
						itemIndex: i,
						item: items[i].json,
					},
				});
			}
		}

		if (conversions.length === 0) {
			if (showProgress) {
				executeFunctions.logger.warn('No valid conversions to process');
			}
			return returnData;
		}

		// Group conversions into batches
		const batches = this.groupIntoBatches(conversions, actualBatchSize);
		const batchIndexMaps = this.groupIntoBatches(itemIndexMap, actualBatchSize);

		if (showProgress) {
			executeFunctions.logger.info(`Created ${batches.length} batches from ${conversions.length} valid conversions`);
		}

		// Process each batch
		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			try {
				const batch = batches[batchIndex];
				const batchItemIndices = batchIndexMaps[batchIndex];
				
				// Process the batch
				const batchResponse = await this.processBatch(
					executeFunctions,
					batch,
					batchIndex,
					batches.length,
					batchProcessingMode,
					showProgress,
					debugMode
				);

				// Handle batch response
				const batchResult = this.processBatchResponse(
					batchResponse,
					batch,
					batchItemIndices,
					items,
					batchIndex + 1,
					debugMode
				);

				returnData.push(...batchResult);

			} catch (error) {
				if (batchProcessingMode === 'failFast') {
					throw error;
				}

				// Handle batch errors in continue mode
				const batch = batches[batchIndex];
				const batchItemIndices = batchIndexMaps[batchIndex];
				
				for (let i = 0; i < batch.length; i++) {
					const itemIndex = batchItemIndices[i];
					returnData.push({
						json: {
							success: false,
							error: `Batch ${batchIndex + 1} failed: ${(error as Error).message}`,
							errorType: (error as any).name || 'Unknown',
							itemIndex: itemIndex,
							item: items[itemIndex].json,
							batchIndex: batchIndex + 1,
						},
					});
				}

				if (showProgress) {
					executeFunctions.logger.error(`Batch ${batchIndex + 1} failed: ${(error as Error).message}`);
				}
			}
		}

		if (showProgress) {
			const successCount = returnData.filter(item => item.json.success).length;
			const errorCount = returnData.filter(item => !item.json.success).length;
			executeFunctions.logger.info(`Batch processing completed: ${successCount} successful, ${errorCount} failed`);
		}

		return returnData;
	}

	/**
	 * Process batch response and create result items
	 */
	private processBatchResponse(
		batchResponse: any,
		batch: any[],
		batchItemIndices: number[],
		originalItems: INodeExecutionData[],
		batchNumber: number,
		debugMode: boolean
	): INodeExecutionData[] {
		const results: INodeExecutionData[] = [];
		
		// Handle successful conversions
		const results_array = batchResponse.results || [];
		
		for (let i = 0; i < batch.length; i++) {
			const conversion = batch[i];
			const itemIndex = batchItemIndices[i];
			const originalItem = originalItems[itemIndex];
			
			// Check if this conversion had an error
			const hasError = batchResponse.partialFailureError && 
							 batchResponse.partialFailureError.details && 
							 batchResponse.partialFailureError.details.some((detail: any) => 
								 detail.errors && detail.errors.some((err: any) => err.location && err.location.fieldPathElements && 
									 err.location.fieldPathElements.some((path: any) => path.index === i)
								 )
							 );

			const result: any = {
				success: !hasError,
				message: hasError ? 'Conversion failed validation or processing' : 
						(batch.length === 1 && results_array[0] ? 'Conversion uploaded successfully' : 'Conversion processed in batch'),
				operation: 'uploadClickConversion',
				conversion: conversion,
				itemIndex: itemIndex,
				batchNumber: batchNumber,
				batchPosition: i + 1,
				originalItem: originalItem.json,
			};

			if (!hasError && results_array[i]) {
				result.conversionResult = results_array[i];
			}

			if (hasError && batchResponse.partialFailureError) {
				result.error = this.extractErrorFromPartialFailure(batchResponse.partialFailureError, i);
			}

			if (debugMode) {
				result.debugInfo = {
					batchResponse: batchResponse,
					processedAt: new Date().toISOString(),
				};
			}

			results.push({
				json: result,
			});
		}

		return results;
	}

	/**
	 * Extract error information from partial failure response
	 */
	private extractErrorFromPartialFailure(partialFailureError: any, conversionIndex: number): string {
		if (!partialFailureError.details) {
			return partialFailureError.message || 'Unknown batch error';
		}

		for (const detail of partialFailureError.details) {
			if (!detail.errors) continue;

			for (const error of detail.errors) {
				if (error.location && error.location.fieldPathElements) {
					const indexPath = error.location.fieldPathElements.find((path: any) => path.index === conversionIndex);
					if (indexPath) {
						return error.message || error.errorCode || 'Unknown conversion error';
					}
				}
			}
		}

		return partialFailureError.message || 'Unknown batch error';
	}

	/**
	 * Process items individually (legacy mode)
	 */
	private async processIndividualItems(executeFunctions: IExecuteFunctions, items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
		const returnData: INodeExecutionData[] = [];

		// Process each input item individually
		for (let i = 0; i < items.length; i++) {
			try {
				const operation = executeFunctions.getNodeParameter('operation', i) as string;
				const debugMode = executeFunctions.getNodeParameter('debugMode', i, false) as boolean;

				if (debugMode) {
					executeFunctions.logger.debug(`GoogleAdsConversion: Processing item ${i + 1}/${items.length}`);
					executeFunctions.logger.debug(`GoogleAdsConversion: Operation = ${operation}`);
				}

				if (operation === 'uploadClickConversion') {
					// Validate input parameters first
					this.validateInputParameters(executeFunctions, i);
					
					// Build conversion payload from node parameters
					const conversion = await this.buildConversionPayload(executeFunctions, i);
					
					// Execute the conversion upload
					const apiResponse = await this.uploadConversion(executeFunctions, conversion, i);
					
					// Process the response
					const result: any = {
						success: true,
						message: executeFunctions.getNodeParameter('validateOnly', i, false) ? 'Conversion validation successful' : 'Conversion uploaded successfully',
						operation,
						conversion,
						response: apiResponse,
						itemIndex: i,
					};

					if (debugMode) {
						result.debugInfo = {
							authenticatedHeaders: await this.getAuthenticatedHeaders(executeFunctions),
							processedAt: new Date().toISOString(),
						};
					}

					returnData.push({
						json: result,
					});

				} else {
					throw new GoogleAdsValidationError(executeFunctions.getNode(), `Operation "${operation}" is not supported`, 'operation');
				}

			} catch (error) {
				// Enhanced error handling with detailed diagnostics
				const debugMode = executeFunctions.getNodeParameter('debugMode', i, false) as boolean;
				const operation = executeFunctions.getNodeParameter('operation', i) as string;
				
				// Extract error details
				const errorMessage = (error as Error).message;
				const errorType = (error as any).name || 'Unknown';
				const httpCode = (error as any).httpCode || 'Unknown';
				const apiErrorCode = (error as any).apiErrorCode || 'Unknown';
				
				// Create detailed error object with diagnostics
				const errorDetails: Record<string, any> = {
					error: errorMessage,
					errorType,
					httpCode,
					apiErrorCode,
					operation,
				};
				
				// Add URL-specific diagnostics for URL errors
				if (errorType === 'GoogleAdsApiError' && apiErrorCode === 'ERR_INVALID_URL') {
					try {
						// Get customer ID for diagnostics
						const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
						const customerId = credentials.customerId as string;
						
						errorDetails.urlDiagnostics = {
							originalCustomerId: customerId,
							sanitizedCustomerId: customerId ? customerId.replace(/\D/g, '') : null,
							customerIdFormat: customerId ? (!/^\d+$/.test(customerId) ? 'Contains non-digit characters' : 'Valid format') : 'Missing',
							attemptedUrl: `/customers/${customerId ? customerId.replace(/\D/g, '') : 'undefined'}:uploadClickConversions`,
						};
						
						// Log detailed diagnostics for URL errors
						executeFunctions.logger.error(`GoogleAdsConversion URL construction error for item ${i + 1}:`, errorDetails);
					} catch (diagError) {
						executeFunctions.logger.error(`Error while collecting URL diagnostics:`, {
							originalError: errorMessage,
							diagnosticError: (diagError as Error).message
						});
					}
				} else {
					// Log standard error details
					executeFunctions.logger.error(`GoogleAdsConversion error for item ${i + 1}:`, errorDetails);
				}
				
				if (executeFunctions.continueOnFail()) {
					// Include detailed error information in the output
					const errorOutput: Record<string, any> = {
						error: errorMessage,
						errorType,
						success: false,
						operation,
						itemIndex: i,
					};
					
					// Add error details for better debugging
					if (httpCode !== 'Unknown') {
						errorOutput.errorDetails = { httpCode };
						if (apiErrorCode !== 'Unknown') {
							errorOutput.errorDetails.apiErrorCode = apiErrorCode;
						}
					}
					
					// Add URL diagnostics for URL errors
					if (errorType === 'GoogleAdsApiError' && apiErrorCode === 'ERR_INVALID_URL' &&
						errorDetails.urlDiagnostics) {
						errorOutput.urlDiagnostics = errorDetails.urlDiagnostics;
					}
					
					// Add full item data in debug mode
					if (debugMode) {
						errorOutput.item = items[i].json;
					}
					
					returnData.push({ json: errorOutput });
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// Process items using batch processing or individual processing  
		const googleAdsConversion = new GoogleAdsConversion();
		const returnData = await googleAdsConversion.processBatchItems(this, items);

		return [returnData];
	}
} 