// LES POINTS DE RENDEZ-VOUS — ceux qui existent vraiment, avec leur point.
//
// 🔴 CE FICHIER RENDAIT `latitude: 0, longitude: 0` POUR TOUS LES HUBS, ET C'EST
// LE DÉFAUT QUI RENDAIT LA FONCTIONNALITÉ INUTILISABLE. `hubs.geo` est une
// `geography` PostGIS que PostgREST rend en WKB hexadécimal ; faute de savoir la
// lire, `versHub` posait deux zéros. Le commentaire d'origine annonçait « mieux
// vaut ne rien rendre que rendre une valeur fausse » — et rendait ensuite le
// golfe de Guinée pour chaque point de rendez-vous de la plateforme.
//
// Conséquence, jamais vue parce que rien ne la relisait : `isInHubZone`,
// `HubZoneMap` et `useHubPresence` ne pouvaient PAS fonctionner sur un hub réel.
// La vérification de zone, la carte du rendez-vous et « Je suis au hub » —
// c'est-à-dire tout le guide client — portaient sur une position fabriquée.
//
// ⚠️ CORRIGÉ EN BASE, PAS ICI (06/09/2026). `public.hubs` porte désormais
// `latitude` et `longitude` en `numeric`, écrites par la même fonction qui écrit
// `geo`, depuis les mêmes deux paramètres. Le client n'a plus à deviner.
//
// 🔴 ET LA RÈGLE ANNONCÉE EST ENFIN TENUE : une ligne inexploitable n'est PAS
// rendue. Un hub sans coordonnées ne s'épingle pas, et le protocole de nommage
// dit que le nom seul ne suffit jamais — l'écarter est la seule réponse honnête.
import { supabase } from '@/lib/supabase';
import type { Hub, HubPlaceType } from '@/types/hub';

type Ligne = {
  id: string;
  name: string;
  place_type: string;
  detail_affiche: string | null;
  address: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  zone_radius_m: number | string | null;
  status: string;
};

// ⚠️ NI `capacity`, NI `current_load`, NI `operating_hours`, NI `phone` : ces
// colonnes ont quitté `hubs` avec l'entrepôt qu'elles décrivaient. Un hub est
// un point de rendez-vous, « pas nécessairement un entrepôt »
// (docs/hubs-fonctionnement.md §1) ; tout cela appartient aux points relais.
const CHAMPS =
  'id, name, place_type, detail_affiche, address, city, latitude, longitude, zone_radius_m, status';

/**
 * Rend `null` plutôt que d'inventer ce qui manque.
 *
 * 🔴 `numeric` REVIENT EN CHAÎNE avec PostgREST, et `Number(null)` vaut `0` :
 * c'est très exactement par là que le « 0, 0 » reviendrait. D'où le contrôle de
 * nullité AVANT la conversion.
 */
const versHub = (l: Ligne): Hub | null => {
  if (l.latitude == null || l.longitude == null || l.zone_radius_m == null) return null;
  const lat = Number(l.latitude);
  const lng = Number(l.longitude);
  const rayon = Number(l.zone_radius_m);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(rayon)) return null;
  if (!l.detail_affiche) return null;

  return {
    id: l.id,
    name: l.name,
    placeType: l.place_type as HubPlaceType,
    displayDetail: l.detail_affiche,
    city: l.city ?? '',
    address: l.address ?? null,
    point: { lat, lng },
    zoneRadiusM: rayon,
    status: l.status === 'active' ? 'active' : 'inactive',
  };
};

const exploitables = (lignes: readonly Ligne[]): Hub[] => {
  const rendus: Hub[] = [];
  for (const l of lignes) {
    const h = versHub(l);
    if (h) rendus.push(h);
    else console.error('[hubs] ligne inexploitable, hub ecarte', l?.id);
  }
  return rendus;
};

/** Tous les points de rendez-vous actifs. */
export async function chargerHubs(): Promise<Hub[]> {
  const { data, error } = await supabase
    .from('hubs')
    .select(CHAMPS)
    .eq('status', 'active')
    .order('city', { ascending: true });
  if (error) throw new Error(error.message);
  return exploitables((data ?? []) as unknown as Ligne[]);
}

/**
 * Les points de rendez-vous d'une ville.
 *
 * ⚠️ RECHERCHE INSENSIBLE À LA CASSE ET AUX ESPACES : la ville vient d'une liste
 * déroulante ici et d'une saisie libre ailleurs. « nice » et « Nice » désignent
 * la même ville, et un cotransporteur qui ne voit pas de hub conclut qu'il n'y
 * en a pas.
 */
export async function chargerHubsParVille(ville: string): Promise<Hub[]> {
  const v = ville.trim();
  if (!v) return [];
  const { data, error } = await supabase
    .from('hubs')
    .select(CHAMPS)
    .eq('status', 'active')
    .ilike('city', v)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return exploitables((data ?? []) as unknown as Ligne[]);
}
