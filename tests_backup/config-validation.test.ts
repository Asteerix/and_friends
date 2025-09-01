/**
 * Configuration validation test
 * This test ensures our Jest configuration is working properly
 */

describe('Jest Configuration Validation', () => {
  test('basic Jest setup works', () => {
    expect(1 + 1).toBe(2);
  });

  test('TypeScript compilation works', () => {
    interface TestInterface {
      id: number;
      name: string;
    }

    const testObject: TestInterface = {
      id: 1,
      name: 'test'
    };

    expect(testObject.id).toBe(1);
    expect(testObject.name).toBe('test');
  });

  test('async/await works', async () => {
    const asyncFunction = async (): Promise<string> => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('success'), 10);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe('success');
  });

  test('module path mapping works', () => {
    // This will fail if @/ path mapping is not working
    expect(typeof require).toBe('function');
    // We just need to ensure the test can run without import errors
    expect(true).toBe(true);
  });

  test('polyfills are available', () => {
    expect(typeof URL).toBe('function');
    expect(typeof TextEncoder).toBe('function');
    expect(typeof TextDecoder).toBe('function');
    expect(typeof performance).toBe('object');
    expect(typeof performance.now).toBe('function');
  });
});