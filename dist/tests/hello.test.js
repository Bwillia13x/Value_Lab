import { hello } from '../src/index';
test('hello returns baseline string', () => {
    expect(hello()).toBe('Value Lab baseline');
});
