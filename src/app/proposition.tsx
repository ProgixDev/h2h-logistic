// UNE PROPOSITION DE CO-LIVRAISON, PUIS LA CANDIDATURE QU'ELLE DEVIENT.
//
// La mise en relation du § 5.2 des CGU H2H Logistic, vue du cotransporteur
// particulier : vingt minutes pour accepter ou refuser (§ 5.2.1) ; accepter, c'est
// candidater sur UN passage (§ 5.2.2) ; l'acheteur choisit, le vendeur valide.
// C'est la route qu'ouvrent les notifications de la mise en relation
// (`/proposition?id=<candidature>`).
//
// ⚠️ L'ÉCRAN NE DÉCIDE RIEN. Délai, marge avant collecte, disponibilité : tout se
// vérifie en base au moment du geste, « même lorsqu'une candidature demeure
// affichée sur un appareil qui n'a pas encore été actualisé » (§ 5.2.10). Un
// refus du serveur se MONTRE, et la relecture qui suit remet l'écran d'aplomb.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { BlocCompteARebours, useMaintenant } from '@/components/mission/CompteARebours';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCandidature, useCandidaturesStore } from '@/stores/useCandidaturesStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { formatCurrency } from '@/utils/formatting';
import {
  dernierAvisDeCandidature,
  explicationStatut,
  heureParis,
  libelleColis,
  libelleJour,
  libelleStatut,
  nomDuHub,
  peutSeRetirer,
  propositionOuverte,
  varianteStatut,
} from '@/utils/candidatures';
import type { HubNomme, PassagePropose } from '@/types/candidature';

type Couleurs = ReturnType<typeof useColorScheme>['colors'];

/** Un passage se désigne par son trajet ET son heure : deux passages peuvent partager l'un ou l'autre. */
const cleDuPassage = (p: PassagePropose) => `${p.routeId}|${p.collecteLe}`;

const lieu = (h: HubNomme | null | undefined) => (h?.ville ? `${nomDuHub(h)}, ${h.ville}` : nomDuHub(h));

export default function PropositionScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const maintenant = useMaintenant();

  const monId = useAuthStore((s) => s.user?.id);
  const charger = useCandidaturesStore((s) => s.charger);
  const isLoading = useCandidaturesStore((s) => s.isLoading);
  const erreur = useCandidaturesStore((s) => s.erreur);
  const enCours = useCandidaturesStore((s) => s.enCours);
  const accepter = useCandidaturesStore((s) => s.accepter);
  const refuser = useCandidaturesStore((s) => s.refuser);
  const retirer = useCandidaturesStore((s) => s.retirer);
  // ⚠️ UN CROCHET, PAS UN GETTER : voir `useMissionStore`, « CE QUE LES ÉCRANS LISENT ».
  const c = useCandidature(id);

  // ⚠️ ON RELIT À L'OUVERTURE, MÊME SI LA LIGNE EST DÉJÀ LÀ : ouverte depuis une
  // notification, elle peut avoir changé depuis la dernière lecture.
  //
  // 🔴 ET SEULEMENT UNE FOIS L'IDENTITÉ CONNUE. Un tap peut démarrer l'application
  // à froid ; une lecture partie avant la reprise de session tournerait en
  // « anon » — et « plus ouverte » s'afficherait sur une proposition bien vivante.
  const [lu, setLu] = useState(false);
  // Les avis aussi : ce sont eux qui disent ce qu'est devenue une candidature sortie de la liste.
  const avis = useNotificationStore((st) => st.notifications);
  const chargerAvis = useNotificationStore((st) => st.charger);
  useEffect(() => {
    if (!monId) return;
    void Promise.all([charger(), chargerAvis()]).then(() => setLu(true));
  }, [monId, id, charger, chargerAvis]);

  const [cleChoisie, setCleChoisie] = useState<string | null>(null);

  if (!c) {
    const issue = lu ? dernierAvisDeCandidature(avis, id ?? '') : null;
    const versMission = issue?.route?.startsWith('/mission/') ?? false;
    return (
      <View style={[s.ecran, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={s.entete}><Header title="Proposition de co-livraison" showBack /></View>
        {!lu || isLoading ? (
          <Text style={[s.attente, { color: colors.textSecondary }]}>Chargement de la proposition…</Text>
        ) : erreur ? (
          // 🔴 UN REFUS DE LECTURE N'EST PAS UNE PROPOSITION EXPIRÉE.
          <EmptyState
            iconName="alert-circle"
            title="Lecture impossible"
            description={erreur}
            actionLabel="Réessayer"
            onAction={() => { void charger(); }}
          />
        ) : issue ? (
          // 🔴 CE QUE LE SERVEUR A DIT D'ELLE : confirmée (elle est devenue une mission), non retenue, demande
          // annulée — et non « délai passé » pour tout ce qui quitte la liste (vu à l'émulateur le 08/10/2026).
          <EmptyState
            iconName={versMission ? 'checkmark-circle' : 'info'}
            title={issue.title}
            description={issue.body}
            actionLabel={versMission ? 'Voir la co-livraison' : 'Voir mes co-livraisons'}
            onAction={() => router.replace((versMission ? issue.route : '/(tabs)/missions') as never)}
          />
        ) : (
          // § 5.2.1 : une notification expirée ne permet pas d'accepter, même si
          // elle reste sur l'appareil.
          <EmptyState
            iconName="hourglass"
            title="Cette proposition n’est plus ouverte"
            description="Son délai de vingt minutes est passé, ou la recherche est terminée. Une notification expirée ne permet plus d’accepter."
            actionLabel="Voir mes co-livraisons"
            onAction={() => router.replace('/(tabs)/missions')}
          />
        )}
      </View>
    );
  }

  const proposition = c.statut === 'proposee';
  const ouverte = propositionOuverte(c, maintenant);
  const passages = c.passages ?? [];
  const passageChoisi =
    passages.find((p) => cleDuPassage(p) === cleChoisie) ?? (passages.length === 1 ? passages[0] : undefined);
  const occupe = enCours === c.id;

  const candidater = async () => {
    if (!passageChoisi) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      // ⚠️ L'HEURE DE COLLECTE REPART TELLE QUE LE SERVEUR L'A RENDUE.
      await accepter(c.id, passageChoisi.routeId, passageChoisi.collecteLe);
    } catch (e) {
      Alert.alert('Candidature non enregistrée', e instanceof Error ? e.message : 'Acceptation impossible');
    }
  };

  const confirmerRefus = () => {
    Alert.alert(
      'Refuser cette proposition ?',
      'Elle ne vous sera plus présentée. D’autres cotransporteurs l’ont reçue : rien n’est perdu pour l’acheteur.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              await refuser(c.id);
              router.back();
            } catch (e) {
              Alert.alert('Refus non enregistré', e instanceof Error ? e.message : 'Refus impossible');
            }
          },
        },
      ],
    );
  };

  const confirmerRetrait = () => {
    Alert.alert(
      'Retirer votre candidature ?',
      'L’acheteur ne pourra plus vous choisir pour cette demande.',
      [
        { text: 'Garder ma candidature', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await retirer(c.id);
              router.back();
            } catch (e) {
              Alert.alert('Retrait non enregistré', e instanceof Error ? e.message : 'Retrait impossible');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.ecran, { backgroundColor: colors.background }]}>
      <View style={[s.entete, { paddingTop: insets.top }]}>
        <Header title={proposition ? 'Proposition de co-livraison' : 'Ma candidature'} showBack />
      </View>

      <ScrollView contentContainerStyle={s.defilement} showsVerticalScrollIndicator={false}>
        {proposition ? (
          <BlocCompteARebours jusquA={c.repondreAvant} libelle="Répondre avant" />
        ) : (
          <View style={s.ligneBadges}>
            <Badge label={libelleStatut(c)} variant={varianteStatut(c)} />
            {c.express && <Badge label="Express" variant="outline" />}
          </View>
        )}

        {c.statut === 'retenue' && c.validationJusquAu && (
          <BlocCompteARebours jusquA={c.validationJusquAu} libelle="Réponse du vendeur attendue avant" />
        )}

        <Card>
          <Text style={[s.trajet, { color: colors.text }]}>{c.villeDepart} → {c.villeArrivee}</Text>
          <Ligne icone="package" texte={libelleColis(c.format, c.poidsMaxKg)} colors={colors} />
          {c.acheteur && <Ligne icone="tab-profile-outline" texte={`Acheteur : ${c.acheteur}`} colors={colors} />}
          <View style={[s.participation, { borderTopColor: colors.border }]}>
            <Text style={[s.participationLibelle, { color: colors.textSecondary }]}>Participation aux frais</Text>
            <Text style={[s.participationMontant, { color: colors.primary }]}>
              {formatCurrency(c.participationCents / 100)}
            </Text>
          </View>
        </Card>

        {proposition ? (
          <Card>
            <Text style={[s.titreSection, { color: colors.text }]}>
              {passages.length > 1 ? 'Choisissez votre passage' : 'Votre passage'}
            </Text>
            <View style={s.passages}>
              {passages.map((p) => (
                <LignePassage
                  key={cleDuPassage(p)}
                  passage={p}
                  choisi={passageChoisi ? cleDuPassage(passageChoisi) === cleDuPassage(p) : false}
                  onChoisir={() => setCleChoisie(cleDuPassage(p))}
                  maintenant={maintenant}
                  colors={colors}
                />
              ))}
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={[s.titreSection, { color: colors.text }]}>Rendez-vous</Text>
            {c.collecteLe && (
              <Etape
                titre={`Collecte ${libelleJour(c.collecteLe, maintenant).toLowerCase()} à ${heureParis(c.collecteLe)}`}
                detail={lieu(c.hubCollecte)}
                teinte={colors.primary}
                colors={colors}
              />
            )}
            {c.hubRemise && c.remiseLe ? (
              <Etape
                titre={`Remise vers ${heureParis(c.remiseLe)}`}
                detail={lieu(c.hubRemise)}
                teinte={colors.success}
                colors={colors}
              />
            ) : (
              <Etape
                titre="Remise — le point sera choisi par l’acheteur"
                detail={(c.remises ?? []).map((r) => `${nomDuHub(r)} (${heureParis(r.remiseLe)})`).join(', ')}
                teinte={colors.success}
                colors={colors}
              />
            )}
          </Card>
        )}

        <View style={[s.explication, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
          <Icon name="alert-circle" size={16} color={colors.primary} />
          <Text style={[s.explicationTexte, { color: colors.text }]}>{explicationStatut(c)}</Text>
        </View>
      </ScrollView>

      {proposition ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title={ouverte ? 'Candidater sur ce passage' : 'Délai dépassé'}
            onPress={() => { void candidater(); }}
            variant="gradient"
            disabled={!ouverte || !passageChoisi || occupe}
            loading={occupe}
            style={{ minHeight: 52 }}
          />
          {ouverte && !passageChoisi && (
            <Text style={[s.aide, { color: colors.textSecondary }]}>Choisissez d’abord un passage.</Text>
          )}
          {ouverte && (
            <TouchableOpacity onPress={confirmerRefus} hitSlop={16} style={s.refus} disabled={occupe}>
              <Text style={[s.refusTexte, { color: colors.textSecondary }]}>Refuser la proposition</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : peutSeRetirer(c) ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <Button
            title="Retirer ma candidature"
            onPress={confirmerRetrait}
            variant="outline"
            disabled={occupe}
            loading={occupe}
          />
        </View>
      ) : null}
    </View>
  );
}

function Ligne({ icone, texte, colors }: { icone: 'package' | 'tab-profile-outline'; texte: string; colors: Couleurs }) {
  return (
    <View style={s.ligne}>
      <Icon name={icone} size={14} color={colors.textSecondary} />
      <Text style={[s.ligneTexte, { color: colors.textSecondary }]}>{texte}</Text>
    </View>
  );
}

function Etape({ titre, detail, teinte, colors }: { titre: string; detail: string; teinte: string; colors: Couleurs }) {
  return (
    <View style={s.etape}>
      <View style={[s.etapePoint, { backgroundColor: teinte }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.etapeTitre, { color: colors.text }]}>{titre}</Text>
        {detail.length > 0 && <Text style={[s.ligneTexte, { color: colors.textSecondary }]}>{detail}</Text>}
      </View>
    </View>
  );
}

function LignePassage({
  passage: p,
  choisi,
  onChoisir,
  maintenant,
  colors,
}: {
  passage: PassagePropose;
  choisi: boolean;
  onChoisir: () => void;
  maintenant: number;
  colors: Couleurs;
}) {
  return (
    <TouchableOpacity
      onPress={onChoisir}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ checked: choisi }}
      style={[
        s.passage,
        { borderColor: choisi ? colors.primary : colors.border, backgroundColor: choisi ? colors.primary + '08' : colors.surface },
      ]}
    >
      <View style={[s.radio, { borderColor: choisi ? colors.primary : colors.textSecondary }]}>
        {choisi && <View style={[s.radioPlein, { backgroundColor: colors.primary }]} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={s.ligneBadges}>
          <Text style={[s.etapeTitre, { color: colors.text }]}>
            {libelleJour(p.collecteLe, maintenant)} · collecte à {heureParis(p.collecteLe)}
          </Text>
          {/* § 5.1.5 : la mention dit la proximité de la collecte, pas une durée d'acheminement. */}
          {p.express && <Badge label="Express" variant="outline" />}
        </View>
        <Text style={[s.ligneTexte, { color: colors.textSecondary }]}>Collecte : {lieu(p.hubCollecte)}</Text>
        <Text style={[s.ligneTexte, { color: colors.textSecondary }]}>
          Remise : {p.remises.map((r) => `${nomDuHub(r)} (${heureParis(r.remiseLe)})`).join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  ecran: { flex: 1 },
  entete: { paddingHorizontal: Spacing.lg },
  attente: { ...Typography.body, textAlign: 'center', marginTop: Spacing.section },
  defilement: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.lg },
  ligneBadges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  trajet: { ...Typography.h3, marginBottom: Spacing.sm },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  ligneTexte: { ...Typography.caption, flexShrink: 1 },
  participation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  participationLibelle: { ...Typography.body },
  participationMontant: { fontFamily: 'Poppins_700Bold', fontSize: 22, lineHeight: 30 },
  titreSection: { ...Typography.h3, marginBottom: Spacing.md },
  passages: { gap: Spacing.sm },
  passage: { flexDirection: 'row', gap: Spacing.md, borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioPlein: { width: 10, height: 10, borderRadius: 5 },
  etape: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  etapePoint: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  etapeTitre: { ...Typography.bodyMedium, flexShrink: 1 },
  explication: { flexDirection: 'row', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  explicationTexte: { ...Typography.caption, lineHeight: 18, flex: 1 },
  actions: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  aide: { ...Typography.caption },
  refus: { paddingVertical: Spacing.sm },
  refusTexte: { ...Typography.bodyMedium, textDecorationLine: 'underline' },
});
