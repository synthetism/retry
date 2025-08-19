# Retry Unit

```bash
 _____      _              _    _       _ _   
|  __ \    | |            | |  | |     (_) |  
| |__) |___| |_ _ __ _   _ | |  | |_ __  _| |_ 
|  _  // _ \ __| '__| | | || |  | | '_ \| | __|
| | \ \  __/ |_| |  | |_| || |__| | | | | | |_ 
|_|  \_\___|\__|_|   \__, | \____/|_| |_|_|\__|
                      __/ |                    
                     |___/                     

version: 1.0.0
```

**Conscious retry logic for resilient operations**

Intelligent retry mechanism with exponential backoff, jitter, and pattern recognition for building fault-tolerant systems.

## Quick Start

```typescript
import { Retry } from '@synet/retry';

// Create retry unit
const retry = Retry.create({
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 5000
});

// Retry any async operation
const result = await retry.retry(async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});

console.log('Success after', result.attempts, 'attempts');
```

## Features

### **Smart Retry Logic**
- **Exponential backoff** with configurable multiplier
- **Jitter** to prevent thundering herd problems
- **Error pattern recognition** for retryable vs non-retryable errors
- **Statistics tracking** for monitoring and optimization

### **Unit Architecture Compliance**
- **Teaching contracts** for retry composition
- **Zero dependencies** - pure TypeScript
- **Immutable configuration** with conscious state management
- **Clear boundaries** between configuration and execution

## Installation

```bash
npm install @synet/retry
```

```typescript
import { Retry } from '@synet/retry';
```

## API Reference

### Retry Creation

```typescript
interface RetryConfig {
  maxAttempts?: number;        // Default: 3
  baseDelay?: number;          // Default: 100ms  
  maxDelay?: number;           // Default: 5000ms
  jitter?: boolean;            // Default: true
  backoffMultiplier?: number;  // Default: 2
  retryableErrors?: string[];  // Default: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
}

const retry = Retry.create({
  maxAttempts: 5,
  baseDelay: 200,
  maxDelay: 10000
});
```

### Core Operations

```typescript
// Retry any async operation
const result = await retry.retry(async () => {
  // Your operation here
  return await riskyOperation();
});

// Result contains execution details
console.log({
  result: result.result,      // Your operation's return value
  attempts: result.attempts,  // Number of attempts made
  success: result.success,    // Whether operation succeeded
  errors: result.errors       // Array of errors encountered
});
```

### Monitoring

```typescript
// Get retry statistics
const stats = retry.getStats();
console.log({
  totalOperations: stats.totalOperations,
  successRate: stats.successRate,
  averageAttempts: stats.averageAttempts
});
```

## Real-World Example

```typescript
import { Retry } from '@synet/retry';

// Network-resilient API client
const networkRetry = Retry.create({
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH']
});

// Resilient data fetching
async function fetchUserData(userId: string) {
  return await networkRetry.retry(async () => {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  });
}

// Usage with error handling
try {
  const userData = await fetchUserData('123');
  console.log('User data:', userData.result);
  console.log('Retrieved after', userData.attempts, 'attempts');
} catch (error) {
  console.error('Failed after all retry attempts:', error);
}
```

## Error Handling

```typescript
// Custom retry conditions
const smartRetry = Retry.create({
  maxAttempts: 3,
  retryableErrors: [
    'ECONNRESET',     // Connection reset
    'ETIMEDOUT',      // Timeout
    'ENOTFOUND',      // DNS resolution failed
    'EHOSTUNREACH'    // Host unreachable
  ]
});

// Non-retryable errors (like 401, 403) fail immediately
// Retryable errors get the full retry treatment
```

---

Built with [Unit Architecture](https://github.com/synthetism/unit) 
