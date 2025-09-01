// Simple test to verify Jest configuration is working
describe('Jest Configuration', () => {
  test('basic math functions work', () => {
    expect(2 + 2).toBe(4);
    expect(3 * 4).toBe(12);
  });

  test('can import and use basic TypeScript features', () => {
    interface TestInterface {
      value: number;
    }
    
    const testObj: TestInterface = { value: 42 };
    expect(testObj.value).toBe(42);
  });

  test('async/await works', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});