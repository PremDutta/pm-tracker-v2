// The app's notion of "now", in one place so tests can pin it
// (jest.spyOn(clock, 'now')) instead of depending on the real date.
export const now = () => new Date();
