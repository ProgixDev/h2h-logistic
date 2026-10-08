// LES PLACES DE MES TRAJETS, relues à chaque retour sur l'écran (hand-to-hand 20261008010000).
//
// ⚠️ UNE LECTURE QUI ÉCHOUE NE MONTRE RIEN : l'écran garde la capacité déclarée, et ne prétend pas qu'un passage est
// libre ou complet sans le savoir.
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { lireCapaciteTrajets } from '@/services/trajets';
import type { CapaciteTrajet } from '@/utils/capaciteTrajet';

export function useCapaciteTrajets(): Record<string, CapaciteTrajet> {
  const [capacites, setCapacites] = useState<Record<string, CapaciteTrajet>>({});
  const lire = useCallback(() => {
    lireCapaciteTrajets().then(setCapacites).catch(() => setCapacites({}));
  }, []);
  useEffect(() => {
    lire();
  }, [lire]);
  useFocusEffect(lire);
  return capacites;
}
