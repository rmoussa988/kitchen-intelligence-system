/** Paper (management) palette — identical to the prototypes' literal hex values. */
export const P = {
  page: '#EFEBDF', surface: '#F7F4EA', card: '#FBF9F2', thead: '#F3F0E4', hover: '#F3F0E1', white: '#FFFFFF',
  border: '#DCD6C4', borderRow: '#E9E4D4', borderInput: '#CFC9B6',
  text: '#1F241F', text2: '#4A5348', text3: '#6E7266', text4: '#9A9C8E',
  ink: '#2E3A2E', ink2: '#263026', inkBorder: '#3D4A3D', inkMuted: '#A9B3A3', inkText: '#C6CDBE', onInk: '#F7F4EA',
  chip: '#E4DFCE',
  amberBg: '#FBF3DF', amberBorder: '#E2CD96', amberFg: '#8A6D1F', amberDot: '#C99A2E', amberPill: '#F5E3B3',
  redBg: '#F6E3E0', redPill: '#F0CFC9', redBorder: '#DFB3AC', redFg: '#96382E', redStrong: '#C0392B',
  greenBg: '#E0E8DA', greenFg: '#48603A', greenStrong: '#3E6B45',
  purpleBg: '#E4E0EE', purpleFg: '#5B5378',
  blueBg: '#DCE4EC', blueFg: '#37536B',
  tealBg: '#DCE8E6', tealFg: '#33625C',
  brownBg: '#EADFD3', brownFg: '#7A5A32',
  greyBg: '#E6E2DA', greyFg: '#6E6A5E',
  rustBg: '#EADBD3', rustFg: '#8A4B2E',
} as const;

/** Sidebar palette. */
export const S = {
  bg: '#242C24', border: '#384237', active: '#2E382E', text: '#F2F1EA', text2: '#B9C2B4', muted: '#9BA398', logo: '#EDE6D6',
} as const;

/** Dark (staff tablet) palette — identical to the prototypes' literal hex values. */
export const D = {
  page: '#101311', headerBorder: '#262B25',
  card: '#1A1E1B', card2: '#14171A', card3: '#161A17', sheet: '#181C18', key: '#1D221E', tileIcon: '#242923', chip: '#2A2F28',
  border: '#2E342E', border2: '#343A33', border3: '#3A4139',
  text: '#F2F1EA', text2: '#C9CFC4', text3: '#B9C2B4', muted: '#9BA398', dim: '#5E665C',
  cream: '#EDE6D6', onCream: '#14171A', gold: '#E0C989', gold2: '#E0A83C',
  amberChip: '#3A3320', amberBorder: '#8A7A3A',
  redChip: '#3A211E', redFg: '#E58B80', redBorder: '#7A3A34', redBadgeFg: '#F2D7D2',
  greenBg: '#22352A', greenBorder: '#3B5A46', greenFg: '#7FC79A', greenDot: '#8FA88F',
  disabled: '#4A4F48',
} as const;

/** Item-type tag colours (B1). */
export const TYPE_STYLE = {
  raw: { bg: '#DCE4EC', fg: '#37536B', dot: '#37536B' },
  sub: { bg: '#E4E0EE', fg: '#5B5378', dot: '#5B5378' },
  prep: { bg: '#E0E8DA', fg: '#48603A', dot: '#48603A' },
  menu: { bg: '#EADFD3', fg: '#7A5A32', dot: '#7A5A32' },
  pack: { bg: '#E6E2DA', fg: '#6E6A5E', dot: '#8B8676' },
} as const;

export const FONT = "'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif";
