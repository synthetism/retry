import { Retry } from '../src/index.js';

// 🎯 Retry Unit Demo - Intelligent Resilience in Action

interface MockApiResponse {
  data: string;
  timestamp: number;
  attempt: number;
}

class MockFlakeyAPI {
  private callCount = 0;
  private readonly failureRate: number;
  private readonly serviceName: string;

  constructor(serviceName: string, failureRate: number = 0.7) {
    this.serviceName = serviceName;
    this.failureRate = failureRate; // 70% failure rate by default
  }

  async fetchData(): Promise<MockApiResponse> {
    this.callCount++;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Random failure simulation
    if (Math.random() < this.failureRate) {
      const errorTypes = [
        { message: 'Connection timeout', code: 'ETIMEDOUT' },
        { message: 'Network unreachable', code: 'EHOSTUNREACH' },
        { message: 'Connection reset', code: 'ECONNRESET' },
        { message: 'Rate limit exceeded', code: 'RATE_LIMIT' },
        { message: 'Service temporarily unavailable' }
      ];
      
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const error = new Error(`${this.serviceName}: ${errorType.message}`);
      if (errorType.code) {
        (error as any).code = errorType.code;
      }
      
      console.log(`💥 ${this.serviceName} failed (attempt ${this.callCount}): ${error.message}`);
      throw error;
    }
    
    console.log(`✅ ${this.serviceName} succeeded on attempt ${this.callCount}`);
    return {
      data: `Success from ${this.serviceName}`,
      timestamp: Date.now(),
      attempt: this.callCount
    };
  }

  reset(): void {
    this.callCount = 0;
  }
}

async function demoBasicRetry() {
  console.log('\n🚀 Demo 1: Basic Retry with Exponential Backoff\n');
  
  const retry = Retry.create({
    maxAttempts: 4,
    baseDelay: 100,
    jitter: true
  });
  
  const api = new MockFlakeyAPI('UserService', 0.6);
  
  try {
    const result = await retry.retry(async () => {
      return await api.fetchData();
    });
    
    console.log('\n📊 Final Result:');
    console.log(`• Success after ${result.attempts} attempts`);
    console.log(`• Total time: ${result.totalDelay}ms`);
    console.log(`• Data: ${result.result.data}`);
    console.log(`• Errors encountered: ${result.errors.length}`);
    
  } catch (error) {
    console.log(`\n❌ Operation failed completely: ${error.message}`);
  }
  
  console.log('\n📈 Retry Statistics:');
  console.log(retry.getStats());
}

async function demoNonRetryableError() {
  console.log('\n🚀 Demo 2: Non-Retryable Error Detection\n');
  
  const retry = Retry.create({ maxAttempts: 3, baseDelay: 50 });
  
  try {
    await retry.retry(async () => {
      throw new Error('Invalid authentication credentials'); // Non-retryable
    });
  } catch (error) {
    console.log(`✅ Fast failure detected: ${error.message}`);
  }
  
  console.log('\n📈 Statistics (should show no retries):');
  console.log(retry.getStats());
}

async function demoMultipleOperations() {
  console.log('\n🚀 Demo 3: Multiple Operations with Learning\n');
  
  const retry = Retry.create({
    maxAttempts: 3,
    baseDelay: 80,
    jitter: true
  });
  
  const services = [
    new MockFlakeyAPI('PaymentService', 0.5),
    new MockFlakeyAPI('NotificationService', 0.8),
    new MockFlakeyAPI('AuditService', 0.3),
    new MockFlakeyAPI('CacheService', 0.9)
  ];
  
  console.log('Running multiple operations in sequence...\n');
  
  for (const [index, service] of services.entries()) {
    try {
      console.log(`🔄 Operation ${index + 1}: ${service.constructor.name}`);
      
      const result = await retry.retry(async () => {
        return await service.fetchData();
      });
      
      console.log(`  ✅ Succeeded after ${result.attempts} attempts in ${result.totalDelay}ms`);
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    
    console.log(''); // Space between operations
  }
  
  console.log('📊 Final Retry Intelligence:');
  const stats = retry.getStats();
  console.log(`• Total operations: ${stats.totalOperations}`);
  console.log(`• Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`• Average attempts: ${stats.averageAttempts.toFixed(1)}`);
  console.log(`• Total retries performed: ${stats.totalRetries}`);
}

async function demoCustomConfiguration() {
  console.log('\n🚀 Demo 4: Custom Retry Configuration\n');
  
  // High-frequency, low-delay retry for critical operations
  const criticalRetry = Retry.create({
    maxAttempts: 5,
    baseDelay: 25,
    maxDelay: 1000,
    backoffMultiplier: 1.5,
    jitter: false // Deterministic for critical ops
  });
  
  const criticalAPI = new MockFlakeyAPI('CriticalPaymentAPI', 0.7);
  
  console.log('Attempting critical operation with aggressive retry...');
  
  try {
    const result = await criticalRetry.retry(async () => {
      return await criticalAPI.fetchData();
    });
    
    console.log(`💎 Critical operation succeeded after ${result.attempts} attempts`);
    
  } catch (error) {
    console.log(`🚨 Critical operation failed: ${error.message}`);
  }
  
  console.log('\n📈 Critical Operation Stats:');
  console.log(criticalRetry.getStats());
}

async function demoRetryLearning() {
  console.log('\n🚀 Demo 5: Retry Unit Teaching/Learning\n');
  
  const masterRetry = Retry.create({ maxAttempts: 2, baseDelay: 100 });
  const learnerRetry = Retry.create({ maxAttempts: 4, baseDelay: 200 });
  
  // Master retry learns some capabilities first
  const api = new MockFlakeyAPI('LearningAPI', 0.6);
  
  try {
    await masterRetry.retry(async () => await api.fetchData());
  } catch (e) {
    // Expected to potentially fail
  }
  
  console.log('📚 Master Retry can teach these capabilities:');
  const teaching = masterRetry.teach();
  console.log(`• Unit ID: ${teaching.unitId}`);
  console.log(`• Capabilities: ${Object.keys(teaching.capabilities).join(', ')}`);
  
  // In a real scenario, other units could learn retry capabilities
  console.log('\n🧠 This demonstrates how retry intelligence can be shared across units');
  console.log('Other units can learn retry capabilities and become resilient too!');
}

async function runAllDemos() {
  console.log('🎭 RETRY UNIT DEMONSTRATION');
  console.log('=' .repeat(50));
  console.log('Demonstrating intelligent retry with exponential backoff,');
  console.log('failure detection, and conscious resilience patterns.\n');
  
  try {
    await demoBasicRetry();
    await demoNonRetryableError(); 
    await demoMultipleOperations();
    await demoCustomConfiguration();
    await demoRetryLearning();
    
    console.log('\n🎉 All demos completed! Retry unit demonstrates:');
    console.log('✅ Exponential backoff with jitter');
    console.log('✅ Retryable vs non-retryable error detection');
    console.log('✅ Statistics tracking and learning');
    console.log('✅ Configurable retry policies');
    console.log('✅ Unit Architecture teaching/learning patterns');
    
  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Run the comprehensive demo
runAllDemos().catch(console.error);
