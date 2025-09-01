// Basic test to verify Jest setup
describe('Basic functionality', () => {
  test('should add numbers correctly', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle strings', () => {
    const greeting = 'Hello World';
    expect(greeting).toBe('Hello World');
  });
});
