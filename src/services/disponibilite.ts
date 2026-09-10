// SE DÉCLARER HORS LIGNE, POUR DE VRAI.
//
// 🔴 LE BOUTON EXISTAIT SUR TROIS ÉCRANS ET NE FAISAIT RIEN. `toggleOnline` du
// magasin basculait une valeur zustand, l'écrivait dans le stockage local, et
// s'arrêtait là. Aucun appel réseau : le serveur n'apprenait jamais qu'un
// cotransporteur particulier s'était mis en pause.
//
// 🔴 CE QUE ÇA DONNAIT POUR QUELQU'UN. Malade, en vacances ou au travail, il se
// mettait « hors ligne », voyait le bouton basculer — et continuait de recevoir
// des propositions de co-livraison qu'on attendait de lui. Sa seule sortie
// réelle était de RETIRER ses trajets, donc de perdre ses trajets récurrents
// pour une absence de deux jours.
//
// ⚠️ ET LE SERVEUR NE SAVAIT MÊME PAS QUOI EN FAIRE. `app.trajets_compatibles`
// ne lisait pas `courier_profiles.is_online`, et cette table n'avait AUCUN
// écrivain : ni policy d'écriture (fermée à raison — un cotransporteur s'y
// attribuait son badge de vérification et son compte Stripe), ni RPC. La
// migration `20260823280000` pose les deux bouts.
import { supabase } from '@/lib/supabase';

/**
 * Met le cotransporteur en pause, ou l'en sort. Rend l'état RETENU PAR LE
 * SERVEUR.
 *
 * ⚠️ ON REND CE QUE LE SERVEUR DIT, PAS CE QU'ON A DEMANDÉ. C'est ce qui
 * empêche l'écran de rebasculer tout seul quand l'appel a échoué — le défaut
 * qu'on vient de corriger, sous une autre forme.
 */
export async function basculerEnLigne(enLigne: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('basculer_en_ligne', {
    p_en_ligne: enLigne,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * L'état EN LIGNE tel que le serveur le tient — celui qui décide des propositions.
 *
 * 🔴 L'APPLICATION NE LE LISAIT JAMAIS (vu à l'émulateur le 10/09/2026). Elle
 * repartait de son stockage local, « hors ligne » par défaut après une
 * installation ou une déconnexion — pendant que le serveur, lui, tenait le
 * cotransporteur EN LIGNE et lui proposait des co-livraisons. L'interrupteur
 * disait le contraire de la vérité, dans le sens qui coûte le plus : on se croit
 * en pause, on ne regarde plus, et une proposition expire.
 *
 * ⚠️ PAS DE LIGNE = EN LIGNE. C'est la règle du serveur
 * (`coalesce(cp.is_online, true)` dans `app.trajets_compatibles`) : un
 * cotransporteur qui n'a jamais basculé est proposé. L'écran doit dire la même
 * chose.
 */
export async function lireEnLigne(profilId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('courier_profiles')
    .select('is_online')
    .eq('profile_id', profilId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { is_online: boolean } | null)?.is_online ?? true;
}

/**
 * Enregistre ce que le cotransporteur possède vraiment : son véhicule et ses
 * modes de transport.
 *
 * ⚠️ NI LA NOTE, NI LE NOMBRE DE CO-LIVRAISONS, NI LE BADGE DE VÉRIFICATION.
 * Ce sont des verdicts rendus par la plateforme ; la fonction serveur ne les
 * accepte pas, et c'est délibéré.
 */
export async function majProfilCotransporteur(champs: {
  transportTypes?: string[];
  vehicleInfo?: string;
  vehiclePlate?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('maj_profil_cotransporteur', {
    p_transport_types: champs.transportTypes ?? null,
    p_vehicle_info: champs.vehicleInfo ?? null,
    p_vehicle_plate: champs.vehiclePlate ?? null,
  });
  if (error) throw new Error(error.message);
}
