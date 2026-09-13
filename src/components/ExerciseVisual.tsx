import React from 'react';
import { BarbellVisual } from './BarbellVisual';
import { BodyweightVisual } from './BodyweightVisual';
import { DumbbellVisual } from './DumbbellVisual';
import { MachineVisual } from './MachineVisual';
import { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  weightKg: number;
  reps: number;
  label: string;
}

export function ExerciseVisual({ exercise, weightKg, reps, label }: Props) {
  switch (exercise.equipment) {
    case 'barbell':
      return <BarbellVisual totalWeightKg={weightKg} label={label} />;
    case 'dumbbell':
      return <DumbbellVisual perHandKg={weightKg} label={label} />;
    case 'machine':
      return <MachineVisual weightKg={weightKg} label={label} />;
    case 'bodyweight':
      return <BodyweightVisual value={reps} label={label} />;
  }
}
