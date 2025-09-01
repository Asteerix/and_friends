describe('Test Setup', () => {
  it('should run tests properly', () => {
    expect(2 + 2).toBe(4);
  });

  it('should have access to globals', () => {
    expect(__DEV__).toBeDefined();
  });
});
