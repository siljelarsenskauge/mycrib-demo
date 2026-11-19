// Navigation in this version (Synne 11.11): three tabs – MyCrib (your rooms and moodboards), Explore (images to
// discover your style) and Nature (try nature palettes in your rooms).
export const NAV = 'v3' as 'v1' | 'v2' | 'v3';
export const TABS = { home: 'MyCrib', creative: 'Explore', creativePath: '/discover', nature: 'Nature', naturePath: '/nature', boards: 'Moodboards', boardsPath: '/moodboards' };
/** set by Try nature, so the room opens with «How brave are you?» showing */
export const openBrave = { roomId: null as string | null };
