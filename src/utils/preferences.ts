import AsyncStorage from '@react-native-async-storage/async-storage';

const FILMING_INSTRUCTIONS_COUNT_KEY = 'filming_instructions_count';
const MAX_FILMING_INSTRUCTIONS_SHOWS = 3;

export async function shouldShowFilmingInstructions(): Promise<boolean> {
  try {
    const countStr = await AsyncStorage.getItem(FILMING_INSTRUCTIONS_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    console.log(`[Preferences] shouldShowFilmingInstructions: count=${count}, max=${MAX_FILMING_INSTRUCTIONS_SHOWS}, should show=${count < MAX_FILMING_INSTRUCTIONS_SHOWS}`);
    return count < MAX_FILMING_INSTRUCTIONS_SHOWS;
  } catch (error) {
    console.warn('Error reading filming instructions count:', error);
    return true; // Default to showing instructions if we can't read
  }
}

export async function incrementFilmingInstructionsCount(): Promise<void> {
  try {
    const countStr = await AsyncStorage.getItem(FILMING_INSTRUCTIONS_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const newCount = count + 1;
    console.log(`[Preferences] incrementFilmingInstructionsCount: ${count} -> ${newCount}`);
    await AsyncStorage.setItem(FILMING_INSTRUCTIONS_COUNT_KEY, newCount.toString());
  } catch (error) {
    console.warn('Error incrementing filming instructions count:', error);
  }
}

export async function resetFilmingInstructionsCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FILMING_INSTRUCTIONS_COUNT_KEY);
  } catch (error) {
    console.warn('Error resetting filming instructions count:', error);
  }
}