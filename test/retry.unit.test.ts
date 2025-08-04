import { describe, it, expect, vi } from 'vitest';
import { Retry } from '../src/index.js';

describe('Retry Unit - 80/20 Resilience Tests', () => {
  it('should create retry unit with smart defaults', () => {
    const retry = Retry.create();
    
    expect(retry).toBeDefined();
    expect(retry.whoami()).toContain('Retry');
    expect(retry.whoami()).toContain('Conscious Resilience');
    
    const stats = retry.getStats();
    expect(stats.totalOperations).toBe(0);
    expect(stats.config.maxAttempts).toBe(3);
    expect(stats.config.baseDelay).toBe(100);
  });

  it('should retry failing operations with exponential backoff', async () => {
    const retry = Retry.create({ maxAttempts: 3, baseDelay: 10 });
    let attempts = 0;
    
    const flakyOperation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    };

    const result = await retry.retry(flakyOperation);
    
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(3);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(2);
    expect(attempts).toBe(3);
  });

  it('should fail fast on non-retryable errors', async () => {
    const retry = Retry.create();
    
    const nonRetryableOperation = async () => {
      throw new Error('Invalid input - not retryable');
    };

    await expect(retry.retry(nonRetryableOperation)).rejects.toThrow('Non-retryable error');
    
    const stats = retry.getStats();
    expect(stats.failedOperations).toBe(1);
    expect(stats.totalRetries).toBe(0); // No retries attempted
  });

  it('should recognize retryable network errors', async () => {
    const retry = Retry.create({ maxAttempts: 2, baseDelay: 10 });
    
    const networkErrorOperation = async () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'ETIMEDOUT';
      throw error;
    };

    await expect(retry.retry(networkErrorOperation)).rejects.toThrow('Operation failed after 2 attempts');
    
    const stats = retry.getStats();
    expect(stats.totalRetries).toBe(1); // One retry attempted
  });

  it('should teach retry capabilities', () => {
    const retry = Retry.create();
    
    const teaching = retry.teach();
    
    expect(teaching.unitId).toBe('retry');
    expect(teaching.capabilities).toHaveProperty('retry');
    expect(teaching.capabilities).toHaveProperty('getStats');
    expect(teaching.capabilities).toHaveProperty('isRetryableError');
  });

  it('should track comprehensive statistics', async () => {
    const retry = Retry.create({ maxAttempts: 2, baseDelay: 10 });
    
    // Successful operation
    await retry.retry(async () => 'success');
    
    // Failing operation
    try {
      await retry.retry(async () => { throw new Error('timeout'); });
    } catch (e) {
      // Expected to fail
    }
    
    const stats = retry.getStats();
    expect(stats.totalOperations).toBe(2);
    expect(stats.successfulOperations).toBe(1);
    expect(stats.failedOperations).toBe(1);
    expect(stats.successRate).toBe(0.5);
  });

  it('should serialize state to JSON', () => {
    const retry = Retry.create();
    
    const data = retry.toJson();
    
    expect(data.unitId).toBe('retry');
    expect(data.version).toBe('1.0.0');
    expect(data.stats).toBeDefined();
    expect(data.retryableErrors).toBeInstanceOf(Array);
    expect(data.timestamp).toBeCloseTo(Date.now(), -2);
  });
});
