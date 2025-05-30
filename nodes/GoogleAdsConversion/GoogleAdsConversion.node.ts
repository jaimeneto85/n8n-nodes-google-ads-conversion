import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
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
	 * Validate input parameters before making API calls
	 */
	private validateInputParameters(executeFunctions: IExecuteFunctions, itemIndex: number): void {
		const identificationMethod = executeFunctions.getNodeParameter('identificationMethod', itemIndex) as string;
		const conversionAction = executeFunctions.getNodeParameter('conversionAction', itemIndex) as string;
		const conversionDateTime = executeFunctions.getNodeParameter('conversionDateTime', itemIndex) as string;

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
			const customerId = credentials.customerId as string;

			if (!developerToken || !customerId) {
				throw new GoogleAdsAuthenticationError(executeFunctions.getNode(), 'Missing required credentials: developer token and customer ID must be provided');
			}

			// Return headers required for Google Ads API authentication
			return {
				'developer-token': developerToken,
				'login-customer-id': customerId,
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

		await this.executeWithRetry(
			executeFunctions,
			async () => {
				const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
				const customerId = credentials.customerId as string;

				// Simple test query to validate credentials
				const testPayload = {
					query: 'SELECT customer.id FROM customer LIMIT 1',
				};

				return await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleAdsOAuth2',
					{
						method: 'POST',
						url: `/customers/${customerId}/googleAds:search`,
						body: testPayload,
						headers,
					}
				);
			},
			'Credential Validation',
			debugMode
		);
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
		const conversionDateTime = executeFunctions.getNodeParameter('conversionDateTime', itemIndex) as string;
		const conversionValue = executeFunctions.getNodeParameter('conversionValue', itemIndex, 0) as number;
		const currencyCode = executeFunctions.getNodeParameter('currencyCode', itemIndex, 'USD') as string;
		const orderId = executeFunctions.getNodeParameter('orderId', itemIndex, '') as string;
		const adUserDataConsent = executeFunctions.getNodeParameter('adUserDataConsent', itemIndex, 'UNKNOWN') as string;
		const adPersonalizationConsent = executeFunctions.getNodeParameter('adPersonalizationConsent', itemIndex, 'UNKNOWN') as string;

		// Base conversion object
		const conversion: any = {
			conversionAction: conversionAction.startsWith('customers/') ? conversionAction : `customers/${await this.getCustomerId(executeFunctions)}/conversionActions/${conversionAction}`,
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
	 * Get customer ID from credentials
	 */
	private async getCustomerId(executeFunctions: IExecuteFunctions): Promise<string> {
		const credentials = await executeFunctions.getCredentials('googleAdsOAuth2');
		return credentials.customerId as string;
	}

	/**
	 * Execute conversion upload to Google Ads API with retry logic
	 */
	private async uploadConversion(executeFunctions: IExecuteFunctions, conversion: any, itemIndex: number): Promise<any> {
		const customerId = await this.getCustomerId(executeFunctions);
		const validateOnly = executeFunctions.getNodeParameter('validateOnly', itemIndex, false) as boolean;
		const debugMode = executeFunctions.getNodeParameter('debugMode', itemIndex, false) as boolean;

		// Build the request payload
		const requestPayload = {
			conversions: [conversion],
			partialFailurePolicy: {
				partialFailureEnabled: true,
			},
			validateOnly: validateOnly,
		};

		if (debugMode) {
			executeFunctions.logger.debug('Google Ads Conversion API Request Payload:', { payload: requestPayload });
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
						url: `/customers/${customerId}:uploadClickConversions`,
						body: requestPayload,
						headers: await this.getAuthenticatedHeaders(executeFunctions),
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
				// Make the batch API call
				const response = await executeFunctions.helpers.httpRequestWithAuthentication.call(
					executeFunctions,
					'googleAdsOAuth2',
					{
						method: 'POST',
						url: `/customers/${customerId}:uploadClickConversions`,
						body: requestPayload,
						headers: await this.getAuthenticatedHeaders(executeFunctions),
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
				if (executeFunctions.continueOnFail()) {
					// Log error details for debugging
					executeFunctions.logger.error(`GoogleAdsConversion error for item ${i + 1}:`, {
						error: (error as Error).message,
						errorType: (error as any).name || 'Unknown',
						operation: executeFunctions.getNodeParameter('operation', i) as string,
						item: items[i].json,
					});

					returnData.push({
						json: {
							error: (error as Error).message,
							errorType: (error as any).name || 'Unknown',
							success: false,
							operation: executeFunctions.getNodeParameter('operation', i) as string,
							item: items[i].json,
							itemIndex: i,
						},
					});
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