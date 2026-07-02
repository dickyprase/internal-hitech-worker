export interface PlafonRule {
  id: number;
  type: 'mc' | 'ri';
  label: string;
  statusPernikahan: 'single' | 'married';
  jumlahAnakMin: number;
  jumlahAnakMax: number | null;
  multiplier: number;
  isActive: boolean;
}

export function findPlafonMultiplier(
  rules: PlafonRule[],
  type: 'mc' | 'ri',
  statusPernikahan: 'single' | 'married',
  jumlahAnak: number
): number {
  const filtered = rules.filter(
    (r) => r.type === type && r.isActive && r.statusPernikahan === statusPernikahan
  );

  for (const rule of filtered) {
    if (
      jumlahAnak >= rule.jumlahAnakMin &&
      (rule.jumlahAnakMax === null || jumlahAnak <= rule.jumlahAnakMax)
    ) {
      return rule.multiplier;
    }
  }

  // Fallback
  return type === 'mc' ? 1.0 : 4.0;
}

export function calculatePlafon(gajiPokok: number, multiplier: number): number {
  return gajiPokok * multiplier;
}

export interface DeltaPreview {
  oldPlafonMc: number;
  newPlafonMc: number;
  deltaMc: number;
  oldPlafonRi: number;
  newPlafonRi: number;
  deltaRi: number;
}

export function calculateDeltaPlafon(
  rules: PlafonRule[],
  gajiPokok: number,
  oldStatus: 'single' | 'married',
  oldAnak: number,
  newStatus: 'single' | 'married',
  newAnak: number
): DeltaPreview {
  const oldMultMc = findPlafonMultiplier(rules, 'mc', oldStatus, oldAnak);
  const newMultMc = findPlafonMultiplier(rules, 'mc', newStatus, newAnak);
  const oldMultRi = findPlafonMultiplier(rules, 'ri', oldStatus, oldAnak);
  const newMultRi = findPlafonMultiplier(rules, 'ri', newStatus, newAnak);

  return {
    oldPlafonMc: gajiPokok * oldMultMc,
    newPlafonMc: gajiPokok * newMultMc,
    deltaMc: gajiPokok * (newMultMc - oldMultMc),
    oldPlafonRi: gajiPokok * oldMultRi,
    newPlafonRi: gajiPokok * newMultRi,
    deltaRi: gajiPokok * (newMultRi - oldMultRi)
  };
}
