import { UnitKey } from '../lib/metric';
import { useSettingsStore } from '../store/settingsStore';
import { CategoryKey, ExerciseSlug, Language } from '../types';
import {
  CATEGORY_LABELS,
  EXERCISE_NAMES,
  translations,
  TranslationKey,
  WEEKDAY_NAMES,
  WEEKDAY_NAMES_FULL,
} from './translations';

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export function useT() {
  const language = useSettingsStore((s) => s.language);

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    return interpolate(translations[language][key], vars);
  }

  function exerciseName(slug: ExerciseSlug): string {
    return EXERCISE_NAMES[language][slug];
  }

  function categoryLabel(category: CategoryKey): string {
    return CATEGORY_LABELS[language][category];
  }

  function unitLabel(unit: UnitKey): string {
    if (unit === 'kg') return t('workout.kg');
    if (unit === 'sec') return t('workout.seconds');
    return t('workout.reps');
  }

  function weekdayShort(day: number): string {
    return WEEKDAY_NAMES[language][day];
  }

  function weekdayFull(day: number): string {
    return WEEKDAY_NAMES_FULL[language][day];
  }

  function dateLocale(): string {
    return language === 'tr' ? 'tr-TR' : 'en-US';
  }

  return { t, language, exerciseName, categoryLabel, unitLabel, weekdayShort, weekdayFull, dateLocale };
}

export function exerciseNameFor(language: Language, slug: ExerciseSlug): string {
  return EXERCISE_NAMES[language][slug];
}
