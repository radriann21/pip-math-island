import type { Locale } from '../shared/types';
import { levelInfo } from './xp';

/** Everything the badge rules need, built by the application layer from the player state. */
export interface PlayerSnapshot {
  xp: number;
  streak: number;
  roundsTotal: number;
  totalStars: number;
  topicsTried: number;
  hasMaster: boolean;
  raceBest: number;
  perfectRound: boolean;
  bestCombo: number;
}

export interface BadgeDefinition {
  id: string;
  glyph: 'star' | 'flame' | 'bolt' | 'crown' | 'heart' | 'medal';
  color: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  isEarned(s: PlayerSnapshot): boolean;
}

/** The 12 prototype stickers, same ids and order. */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first',
    glyph: 'star',
    color: '#f5a300',
    title: { en: 'First Steps', es: 'Primeros pasos' },
    description: { en: 'Finish your first round', es: 'Termina tu primera ronda' },
    isEarned: (s) => s.roundsTotal >= 1,
  },
  {
    id: 'perfect',
    glyph: 'crown',
    color: '#e8588a',
    title: { en: 'Perfect Round', es: 'Ronda perfecta' },
    description: { en: 'Get all 10 right on the first try', es: 'Acierta las 10 a la primera' },
    isEarned: (s) => s.perfectRound,
  },
  {
    id: 'combo5',
    glyph: 'bolt',
    color: '#5b3df5',
    title: { en: 'Lightning Brain', es: 'Mente relámpago' },
    description: { en: 'Get 5 in a row on the first try', es: 'Acierta 5 seguidas a la primera' },
    isEarned: (s) => s.bestCombo >= 5,
  },
  {
    id: 'explorer',
    glyph: 'medal',
    color: '#1d9fb0',
    title: { en: 'Explorer', es: 'Exploradora' },
    description: { en: 'Try 6 different topics', es: 'Prueba 6 temas distintos' },
    isEarned: (s) => s.topicsTried >= 6,
  },
  {
    id: 'stars15',
    glyph: 'star',
    color: '#ef8a17',
    title: { en: 'Star Collector', es: 'Coleccionista de estrellas' },
    description: { en: 'Collect 15 stars', es: 'Reúne 15 estrellas' },
    isEarned: (s) => s.totalStars >= 15,
  },
  {
    id: 'stars40',
    glyph: 'star',
    color: '#c452d8',
    title: { en: 'Constellation', es: 'Constelación' },
    description: { en: 'Collect 40 stars', es: 'Reúne 40 estrellas' },
    isEarned: (s) => s.totalStars >= 40,
  },
  {
    id: 'master',
    glyph: 'crown',
    color: '#2fa66a',
    title: { en: 'Topic Master', es: 'Maestra de un tema' },
    description: { en: 'Earn 3 stars in one topic', es: 'Gana 3 estrellas en un tema' },
    isEarned: (s) => s.hasMaster,
  },
  {
    id: 'streak3',
    glyph: 'flame',
    color: '#e8504f',
    title: { en: 'On Fire', es: 'En llamas' },
    description: { en: 'Play 3 days in a row', es: 'Juega 3 días seguidos' },
    isEarned: (s) => s.streak >= 3,
  },
  {
    id: 'streak7',
    glyph: 'flame',
    color: '#c99700',
    title: { en: 'Super Streak', es: 'Súper racha' },
    description: { en: 'Play 7 days in a row', es: 'Juega 7 días seguidos' },
    isEarned: (s) => s.streak >= 7,
  },
  {
    id: 'racer',
    glyph: 'bolt',
    color: '#4c8dff',
    title: { en: 'Speed Racer', es: 'Corredora veloz' },
    description: { en: 'Score 15 in the Quick Race', es: 'Logra 15 en la Carrera Rápida' },
    isEarned: (s) => s.raceBest >= 15,
  },
  {
    id: 'racer2',
    glyph: 'heart',
    color: '#e8588a',
    title: { en: 'Race Champion', es: 'Campeona de carrera' },
    description: { en: 'Score 30 in the Quick Race', es: 'Logra 30 en la Carrera Rápida' },
    isEarned: (s) => s.raceBest >= 30,
  },
  {
    id: 'lvl5',
    glyph: 'medal',
    color: '#7a5cf5',
    title: { en: 'Level 5', es: 'Nivel 5' },
    description: { en: 'Reach level 5', es: 'Llega al nivel 5' },
    isEarned: (s) => levelInfo(s.xp).level >= 5,
  },
];

/** Badges the snapshot earns that are not owned yet, in catalogue order. */
export function newlyEarned(owned: ReadonlySet<string>, s: PlayerSnapshot): BadgeDefinition[] {
  return BADGES.filter((b) => !owned.has(b.id) && b.isEarned(s));
}
