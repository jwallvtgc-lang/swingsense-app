/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Only our own tests — don't pick up anything under ios/ or supabase/functions.
  testMatch: ['**/src/**/__tests__/**/*.test.[jt]s?(x)'],
};
