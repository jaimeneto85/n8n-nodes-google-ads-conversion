import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class GoogleAdsConversion implements INodeType {
    description: INodeTypeDescription;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Retry configuration interface
     */
    private getRetryConfig;
    /**
     * Determine if an error should trigger a retry
     */
    private shouldRetry;
    /**
     * Calculate delay for exponential backoff
     */
    private calculateDelay;
    /**
     * Execute function with retry logic
     */
    private executeWithRetry;
    /**
     * Parse and categorize Google Ads API errors
     */
    private parseApiError;
    /**
     * Validate input parameters before making API calls
     */
    private validateInputParameters;
    /**
     * Get authenticated headers for Google Ads API
     */
    private getAuthenticatedHeaders;
    /**
     * Validate credentials and test API connectivity with retry
     */
    private validateCredentials;
    /**
     * Hash a string using SHA-256 for enhanced conversions
     */
    private hashString;
    /**
     * Build user identifier data for enhanced conversions
     */
    private buildUserIdentifiers;
    /**
     * Build conversion payload for Google Ads API
     */
    private buildConversionPayload;
    /**
     * Get customer ID from credentials
     */
    private getCustomerId;
    /**
     * Execute conversion upload to Google Ads API with retry logic
     */
    private uploadConversion;
    /**
     * Group conversions into batches based on batch size
     */
    private groupIntoBatches;
    /**
     * Process a batch of conversions
     */
    private processBatch;
    /**
     * Process all items using batch processing
     */
    private processBatchItems;
    /**
     * Process batch response and create result items
     */
    private processBatchResponse;
    /**
     * Extract error information from partial failure response
     */
    private extractErrorFromPartialFailure;
    /**
     * Process items individually (legacy mode)
     */
    private processIndividualItems;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
