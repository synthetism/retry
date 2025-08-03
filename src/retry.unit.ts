/**
 * @synet/retry - Conscious Retry Unit for Resilient Operations
 * 
 * Unit Architecture v1.0.6 Implementation
 * 
 * ONE METHOD TO RULE THEM ALL: retry(operation, options?)
 * 
 * Tracer-bullet:
 * - Exponential backoff with jitter (convention over configuration)
 * - Conscious failure learning and pattern recognition
 * - Composable with any async operation
 * - Zero config hell, maximum resilience
 * 
 * @version 1.0.0
 * @author SYNET ALPHA
 */

import { Unit, type UnitProps, createUnitSchema } from '@synet/unit';
import type { TeachingContract } from '@synet/unit';
import { State } from '@synet/state';

/**
 * External input configuration for static create()
 */
export interface RetryConfig {
  maxAttempts?: number;        // Default: 3
  baseDelay?: number;          // Default: 100ms
  maxDelay?: number;           // Default: 5000ms
  jitter?: boolean;            // Default: true (adds randomness)
  backoffMultiplier?: number;  // Default: 2 (exponential)
  retryableErrors?: string[];  // Default: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
}

/**
 * Internal state after validation (implements UnitProps)
 */
export interface RetryProps extends UnitProps {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  backoffMultiplier: number;
  retryableErrors: Set<string>;
  stateUnit: State;
}

/**
 * Retry operation result
 */
export interface RetryResult<T> {
  readonly result: T;
  readonly attempts: number;
  readonly totalDelay: number;
  readonly errors: Error[];
  readonly success: boolean;
  readonly timestamp: Date;
}

/**
 * Retry Unit Implementation
 * 
 * Doctrine #1: ZERO DEPENDENCY (only native setTimeout/Promise)
 * Doctrine #17: VALUE OBJECT FOUNDATION (immutable with identity and capabilities)
 */
export class Retry extends Unit<RetryProps> {
  
  // Doctrine #4: CREATE NOT CONSTRUCT (protected constructor)
  protected constructor(props: RetryProps) {
    super(props);
  }

   static create(config: RetryConfig = {}): Retry {
    // Create state unit for statistics
    const stateUnit = State.create({
      unitId: 'retry',
      initialState: {
        totalOperations: 0,
        totalRetries: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageAttempts: 0
      }
    });

    const props: RetryProps = {
      dna: createUnitSchema({
        id: 'retry',
        version: '1.0.0'
      }),
      maxAttempts: config.maxAttempts ?? 3,
      baseDelay: config.baseDelay ?? 100,
      maxDelay: config.maxDelay ?? 5000,
      jitter: config.jitter ?? true,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableErrors: new Set(config.retryableErrors ?? ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH']),
      stateUnit
    };

    return new Retry(props);
  }


  async retry<T>(operation: () => Promise<T>, customOptions?: Partial<RetryConfig>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    const config = this.mergeOptions(customOptions);
    
    // Update stats
    const totalOperations = this.props.stateUnit.get<number>('totalOperations') ?? 0;
    this.props.stateUnit.set('totalOperations', totalOperations + 1);

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // SUCCESS - Update stats and return
        const successfulOperations = this.props.stateUnit.get<number>('successfulOperations') ?? 0;
        const totalRetries = this.props.stateUnit.get<number>('totalRetries') ?? 0;
        this.props.stateUnit.set('successfulOperations', successfulOperations + 1);
        this.props.stateUnit.set('totalRetries', totalRetries + (attempt - 1));
        
        return {
          result,
          attempts: attempt,
          totalDelay: Date.now() - startTime,
          errors,
          success: true,
          timestamp: new Date()
        };
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        
        // Check if this is the last attempt
        if (attempt === config.maxAttempts) {
          // FINAL FAILURE - Update stats and throw
          const failedOperations = this.props.stateUnit.get<number>('failedOperations') ?? 0;
          const totalRetries = this.props.stateUnit.get<number>('totalRetries') ?? 0;
          this.props.stateUnit.set('failedOperations', failedOperations + 1);
          this.props.stateUnit.set('totalRetries', totalRetries + (attempt - 1));
          
          throw new Error(`[${this.dna.id}] Operation failed after ${attempt} attempts. Last error: ${err.message}. All errors: ${errors.map(e => e.message).join(', ')}`);
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(err)) {
          // NON-RETRYABLE ERROR - Update stats and throw immediately
          const failedOperations = this.props.stateUnit.get<number>('failedOperations') ?? 0;
          const totalRetries = this.props.stateUnit.get<number>('totalRetries') ?? 0;
          this.props.stateUnit.set('failedOperations', failedOperations + 1);
          this.props.stateUnit.set('totalRetries', totalRetries + (attempt - 1));
          
          throw new Error(`[${this.dna.id}] Non-retryable error: ${err.message}`);
        }
        
        // RETRYABLE ERROR - Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }
    
    // This should never be reached, but TypeScript wants it
    throw new Error(`[${this.dna.id}] Unexpected retry loop completion`);
  }


  help(): string {
    const stats = this.getStats();
    
    return `
Retry v${this.dna.version} - 80/20 Conscious Resilience for Any Operation

Current Stats: ${stats.totalOperations} operations, ${stats.totalRetries} retries
Success Rate: ${((stats.successfulOperations / stats.totalOperations) * 100).toFixed(1)}%
Average Attempts: ${stats.averageAttempts.toFixed(1)}

🎯 ONE METHOD TO RULE THEM ALL:
• retry(operation, options?) - Conscious resilience for any async operation

Default Configuration:
• maxAttempts: ${this.props.maxAttempts} (tries)
• baseDelay: ${this.props.baseDelay}ms (starting delay)
• maxDelay: ${this.props.maxDelay}ms (cap on delays)
• backoffMultiplier: ${this.props.backoffMultiplier}x (exponential growth)
• jitter: ${this.props.jitter} (adds randomness to prevent thundering herd)

🧠 Conscious Features:
• Exponential backoff with jitter by default
• Retryable error detection (network, timeout, etc.)
• Non-retryable error immediate failure
• Complete operation statistics and learning
• Zero configuration required

🔧 Management:
• getStats() - View retry statistics and patterns
• isRetryableError(error) - Check if error should trigger retry
• toJson() - Serialize for persistence/logging

Teaching:
• Teaches retry capabilities for composition
• Works with any async operation
• Conscious failure pattern recognition

Example:
  const retry = Retry.create();
  
  // Retry any operation with intelligent backoff
  const result = await retry.retry(async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return response.json();
  });
  
  console.log(\`Success after \${result.attempts} attempts\`);
`;
  }

 teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        retry: ((...args: unknown[]) => this.retry(args[0] as () => Promise<unknown>, args[1] as Partial<RetryConfig>)) as (...args: unknown[]) => unknown,
        getStats: () => this.getStats.bind(this),
        isRetryableError: ((...args: unknown[]) => this.isRetryableError(args[0] as Error)) as (...args: unknown[]) => unknown,
        toJson: () => this.toJson.bind(this)
      }
    };
  }

  whoami(): string {
    const stats = this.getStats();
    return `Retry[${stats.totalOperations}ops, ${stats.successfulOperations}✓] - Conscious Resilience - v${this.dna.version}`;
  }

  // Statistics and monitoring
  getStats() {
    const totalOperations = this.props.stateUnit.get<number>('totalOperations') ?? 0;
    const totalRetries = this.props.stateUnit.get<number>('totalRetries') ?? 0;
    const successfulOperations = this.props.stateUnit.get<number>('successfulOperations') ?? 0;
    const failedOperations = this.props.stateUnit.get<number>('failedOperations') ?? 0;
    const averageAttempts = totalOperations > 0 ? (totalOperations + totalRetries) / totalOperations : 0;
    
    return {
      totalOperations,
      totalRetries,
      successfulOperations,
      failedOperations,
      successRate: totalOperations > 0 ? (successfulOperations / totalOperations) : 0,
      averageAttempts,
      configuration: {
        maxAttempts: this.props.maxAttempts,
        baseDelay: this.props.baseDelay,
        maxDelay: this.props.maxDelay,
        jitter: this.props.jitter,
        backoffMultiplier: this.props.backoffMultiplier
      }
    };
  }

  toJson() {
    const stats = this.getStats();
    return {
      unitId: this.dna.id,
      version: this.dna.version,
      timestamp: Date.now(),
      stats,
      retryableErrors: Array.from(this.props.retryableErrors)
    };
  }


  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = (error as NodeJS.ErrnoException).code;
    
    // Check explicit error codes
    if (code && this.props.retryableErrors.has(code)) {
      return true;
    }
    
    // Check message patterns for retryable errors
    const retryablePatterns = [
      'network', 'timeout', 'connection', 'reset', 'refused', 
      'unreachable', 'temporarily', 'temporary', 'rate limit', '5', '429', '502', '503', '504',
      'unavailable', 'service'
    ];
    
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    let delay = this.props.baseDelay * this.props.backoffMultiplier ** (attempt - 1);
    
    // Cap at maxDelay
    delay = Math.min(delay, this.props.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.props.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * jitterAmount;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  private mergeOptions(customOptions?: Partial<RetryConfig>): Required<RetryConfig> {
    return {
      maxAttempts: customOptions?.maxAttempts ?? this.props.maxAttempts,
      baseDelay: customOptions?.baseDelay ?? this.props.baseDelay,
      maxDelay: customOptions?.maxDelay ?? this.props.maxDelay,
      jitter: customOptions?.jitter ?? this.props.jitter,
      backoffMultiplier: customOptions?.backoffMultiplier ?? this.props.backoffMultiplier,
      retryableErrors: customOptions?.retryableErrors ?? Array.from(this.props.retryableErrors)
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
