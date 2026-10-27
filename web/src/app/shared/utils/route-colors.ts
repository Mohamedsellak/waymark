/** Route inks, after chart and survey-map colour conventions. Magenta leads: the plotted course. */
const INKS = ['#b0177a', '#1f6f99', '#3f7a3a', '#b7791f', '#6b3fa0', '#0f8585', '#a4472b', '#4a5a66'];

export const routeColor = (index: number): string => INKS[index % INKS.length];
