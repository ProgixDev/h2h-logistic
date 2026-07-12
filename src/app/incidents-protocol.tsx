import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type Tone = 'danger' | 'support' | 'neutral';

interface Section {
  label: string;
  lead?: string;
  paragraphs?: string[];
  bullets?: string[];
  button?: string;
}

interface Scenario {
  number: number;
  title: string;
  badge: string;
  tone: Tone;
  sections: Section[];
}

const INTRO: string[] = [
  "Ce protocole encadre les absences, annulations, retards et incidents liés aux co-livraisons H2H Logistic.",
  "Chaque partie doit respecter les horaires indiqués, la tolérance prévue, les validations dans l'application et les formulaires de réclamation.",
  "Les conséquences financières dépendent de la présence des parties, de la remise du colis, de la clôture de mission et de la décision éventuelle du support HandtoHand.",
];

const LECTURE_RAPIDE: { title: string; text: string }[] = [
  { title: 'Présence obligatoire au rendez-vous', text: 'Chaque partie doit être présente au hub ou au point de rendez-vous prévu.' },
  { title: 'Tolérance maximale de 10 minutes', text: "Une tolérance maximale de 10 minutes après l'heure prévue peut être appliquée. Passé ce délai, une absence peut être retenue selon le protocole." },
  { title: "Prolonger l'attente ou clôturer", text: "Lorsqu'une partie est absente, la partie présente peut prolonger l'attente ou clôturer la mission selon les options disponibles dans l'application." },
  { title: 'Frais et remboursements selon responsabilité', text: "Les paiements, remboursements et frais d'annulation sont appliqués selon la partie absente, la remise du colis et la responsabilité constatée." },
  { title: 'Réclamation par formulaire', text: "Toute contestation doit être effectuée via le formulaire prévu dans l'application." },
];

const PRESENCE_RULE: {
  title: string;
  intro: string;
  concerneLead: string;
  concerne: string[];
  blocks: { title: string; paragraphs?: string[]; lead?: string; bullets?: string[]; trailing?: string[] }[];
} = {
  title: 'Validation de présence au hub',
  intro: "Une fois le créneau horaire ouvert, les deux parties concernées par l'étape doivent appuyer sur le bouton « Je suis au hub ».",
  concerneLead: 'Cela concerne :',
  concerne: [
    'le vendeur et le cotransporteur au moment de la collecte ;',
    "l'acheteur et le cotransporteur au moment de la remise.",
  ],
  blocks: [
    {
      title: 'Affichage de la carte',
      paragraphs: [
        "Lorsqu'une première partie appuie sur « Je suis au hub », le hub s'affiche sur une carte dans l'application.",
        "La position de cette partie est enregistrée par l'application, mais elle n'est pas rendue visible à l'autre partie tant que celle-ci n'a pas également appuyé sur « Je suis au hub ».",
      ],
    },
    {
      title: 'Visibilité des positions GPS',
      lead: 'Les positions GPS deviennent visibles uniquement lorsque les deux conditions suivantes sont réunies :',
      bullets: [
        'les deux parties ont appuyé sur « Je suis au hub » ;',
        "les deux positions GPS sont détectées à l'intérieur de la zone du hub.",
      ],
      trailing: ['À partir de ce moment, les deux parties peuvent voir leur position respective sur la carte afin de se retrouver plus facilement.'],
    },
    {
      title: 'Protection de la confidentialité',
      paragraphs: [
        "Si une seule partie appuie sur « Je suis au hub », l'autre partie ne voit pas sa position GPS.",
        "Si une partie appuie sur « Je suis au hub » mais que sa position n'est pas détectée dans la zone du hub, sa position n'est pas affichée à l'autre partie.",
        'La visibilité GPS est donc limitée au strict nécessaire pour permettre la rencontre au hub pendant le créneau prévu.',
      ],
    },
    {
      title: 'Règle simple',
      bullets: [
        'Pas de double validation « Je suis au hub » = pas de visibilité GPS partagée.',
        'Double validation + présence dans la zone du hub = positions visibles sur la carte.',
      ],
    },
  ],
};

const SCENARIOS_INTRO =
  "Les scénarios suivants couvrent les principaux cas d'absence, d'annulation ou d'incident lors d'une co-livraison. Chaque cas précise la situation, les actions possibles, les conséquences et les possibilités de réclamation.";

const SCENARIOS: Scenario[] = [
  {
    number: 1,
    title: 'Cotransporteur présent au hub de remise, acheteur absent',
    badge: 'Responsable : Acheteur absent',
    tone: 'danger',
    sections: [
      { label: 'Situation', bullets: [
        'Le cotransporteur arrive au hub de remise prévu avec le colis.',
        "L'acheteur n'est pas présent après la tolérance autorisée.",
        "La mission est toujours active dans l'application.",
      ] },
      { label: 'Actions possibles', lead: 'Le cotransporteur peut :', bullets: [
        "prolonger l'attente ;",
        "clôturer la mission pour absence de l'acheteur.",
      ] },
      { label: 'Conséquence', lead: "Si le cotransporteur clôture la mission après l'absence de l'acheteur :", bullets: [
        'le vendeur est payé ;',
        'le cotransporteur est payé ;',
        'la mission est considérée comme effectuée ;',
        "l'acheteur peut ouvrir une réclamation via le formulaire prévu dans l'application.",
      ] },
    ],
  },
  {
    number: 2,
    title: 'Acheteur présent au hub de remise, cotransporteur absent',
    badge: 'Responsable : Cotransporteur absent',
    tone: 'danger',
    sections: [
      { label: 'Situation', bullets: [
        "L'acheteur est présent au hub de remise.",
        'Le cotransporteur ne se présente pas après la tolérance autorisée.',
        "Le colis n'est pas remis à l'acheteur.",
      ] },
      { label: 'Actions possibles', lead: "L'acheteur peut :", bullets: [
        "prolonger l'attente ;",
        'clôturer la mission pour absence du cotransporteur.',
      ] },
      { label: 'Conséquence', lead: "Si l'acheteur clôture la mission pour absence du cotransporteur :", bullets: [
        'le vendeur est payé ;',
        "le cotransporteur n'est pas rémunéré ;",
        "l'acheteur est remboursé de la valeur du prix du produit ;",
        "l'acheteur est remboursé de sa participation aux frais de co-livraison ;",
        "l'acheteur est remboursé des frais de service payés ;",
        "l'acheteur est remboursé des frais de mise en relation payés ;",
        "l'ensemble des montants remboursés à l'acheteur est imputé au cotransporteur absent fautif ;",
        'les frais dus à HandtoHand restent acquis à la plateforme ;',
        'le cotransporteur peut contester via un formulaire de réclamation.',
      ] },
    ],
  },
  {
    number: 3,
    title: 'Acheteur et cotransporteur absents au hub de remise',
    badge: 'Décision support HandtoHand',
    tone: 'support',
    sections: [
      { label: 'Situation', bullets: [
        'Le hub de remise est atteint dans le parcours.',
        "L'acheteur n'est pas présent.",
        "Le cotransporteur n'est pas présent.",
        'Le chrono et la tolérance sont terminés.',
      ] },
      { label: 'Conséquence', lead: "Un délai de 10 minutes est ouvert pour permettre à l'une des parties de déposer une réclamation. Passé ce délai :", bullets: [
        'la co-livraison est bloquée ;',
        'le dossier passe en décision du support HandtoHand ;',
        "le support analyse les preuves disponibles dans l'application ;",
        'après décision, les parties peuvent contester via un formulaire de réclamation.',
      ] },
    ],
  },
  {
    number: 4,
    title: 'Vendeur absent au rendez-vous avec le cotransporteur',
    badge: 'Responsable : Vendeur absent',
    tone: 'danger',
    sections: [
      { label: 'Situation', bullets: [
        'Le cotransporteur se présente au rendez-vous de collecte.',
        "Le vendeur n'est pas présent après la tolérance autorisée.",
        "Le colis n'est pas remis au cotransporteur.",
      ] },
      { label: 'Conséquence', bullets: [
        "l'acheteur est remboursé intégralement ;",
        "un frais d'annulation de 4 € est imputé au vendeur ;",
        '3 € sont reversés au cotransporteur ;',
        '1 € est conservé par HandtoHand ;',
        'le vendeur peut contester via un formulaire de réclamation.',
      ] },
    ],
  },
  {
    number: 5,
    title: 'Annulation par le vendeur avant le créneau',
    badge: 'Annulation vendeur',
    tone: 'neutral',
    sections: [
      { label: 'Règle', paragraphs: ['Le vendeur peut annuler la co-livraison à tout moment avant le créneau horaire prévu, sans frais.'] },
    ],
  },
  {
    number: 6,
    title: "Annulation par l'acheteur",
    badge: 'Annulation acheteur',
    tone: 'neutral',
    sections: [
      {
        label: 'Règle',
        paragraphs: ["L'acheteur peut annuler sans frais jusqu'à 1 heure avant le rendez-vous prévu entre le vendeur et le cotransporteur."],
        lead: "Si l'acheteur annule moins d'une heure avant ce rendez-vous :",
        bullets: [
          'les frais de service restent acquis à HandtoHand ;',
          'les frais de protection restent acquis à HandtoHand ;',
          'les frais de mise en relation restent acquis à HandtoHand.',
        ],
      },
    ],
  },
  {
    number: 7,
    title: 'Mission engagée après remise du colis',
    badge: 'Colis remis au cotransporteur',
    tone: 'neutral',
    sections: [
      {
        label: 'Règle',
        paragraphs: ['Une fois que le vendeur a remis le colis au cotransporteur, la mission entre dans une phase engagée.'],
        lead: 'À partir de cette étape :',
        bullets: [
          "aucune annulation volontaire n'est possible ;",
          "aucune modification volontaire de mission n'est possible ;",
          "aucune demande de remboursement volontaire n'est possible ;",
          'les incidents éventuels sont traités uniquement selon le protocole H2H Logistic.',
        ],
      },
    ],
  },
  {
    number: 8,
    title: 'Refus du colis par le cotransporteur lors de la collecte',
    badge: 'Contrôle du colis',
    tone: 'neutral',
    sections: [
      {
        label: 'Situation',
        paragraphs: ["Lors de la collecte, le cotransporteur vérifie l'état du colis et sa conformité avec la demande."],
        lead: 'Le cotransporteur peut refuser la co-livraison si :',
        bullets: [
          'le colis ne correspond pas à la description ;',
          'les dimensions sont différentes ;',
          'le volume est incompatible ;',
          'le poids est incompatible ;',
          "l'emballage ne permet pas un transport correct ;",
          'le colis présente un risque ou une anomalie visible.',
        ],
      },
      {
        label: 'Action obligatoire',
        paragraphs: ['Le cotransporteur doit appuyer sur :'],
        button: 'Annuler la co-livraison',
        lead: "Puis remplir le formulaire d'annulation.",
      },
    ],
  },
  {
    number: 9,
    title: "Annulation par le cotransporteur",
    badge: 'Annulation cotransporteur',
    tone: 'neutral',
    sections: [
      {
        label: 'Règle',
        paragraphs: ["Le cotransporteur peut annuler sans frais jusqu'à 1 heure avant le rendez-vous prévu."],
        lead: "Si le cotransporteur annule moins d'une heure avant le créneau :",
        bullets: [
          "un frais d'annulation tardive de 2 € lui est imputé ;",
          'la mission peut être réattribuée ou annulée selon disponibilité ;',
          "les parties sont informées dans l'application.",
        ],
      },
    ],
  },
  {
    number: 10,
    title: 'Vendeur et cotransporteur absents au rendez-vous de collecte',
    badge: 'Décision support HandtoHand',
    tone: 'support',
    sections: [
      { label: 'Situation', bullets: [
        'Le rendez-vous entre le vendeur et le cotransporteur est prévu.',
        "Le vendeur n'est pas présent.",
        "Le cotransporteur n'est pas présent.",
        'La tolérance autorisée est terminée.',
      ] },
      { label: 'Conséquence', bullets: [
        'un délai de 10 minutes est ouvert pour permettre aux parties concernées de déposer une réclamation ;',
        'la mission est ensuite clôturée ;',
        "l'acheteur est remboursé ;",
        'la co-livraison passe en analyse support HandtoHand ;',
        "après étude, le vendeur peut se voir imputer un frais d'annulation de 2 € ;",
        "après étude, le cotransporteur peut se voir imputer un frais d'annulation de 2 € ;",
        'la décision peut être contestée via un formulaire de réclamation.',
      ] },
    ],
  },
];

const PRINCIPLES_SUBTEXT =
  "Ces principes guident le traitement des absences, annulations, remises de colis et réclamations dans H2H Logistic.";

const PRINCIPLES: { title: string; text: string }[] = [
  { title: 'Présence obligatoire', text: "Chaque partie doit être présente au rendez-vous prévu. Il est recommandé d'arriver 10 minutes avant l'heure indiquée." },
  { title: 'Tolérance limitée', text: "Une tolérance maximale de 10 minutes après l'heure prévue peut être appliquée. Passé ce délai, l'absence peut être retenue." },
  { title: 'Marge de sécurité', text: 'Les horaires proposés doivent tenir compte du trafic, du stationnement, des distances entre les hubs et des imprévus prévisibles.' },
  { title: 'Prolonger ou clôturer', text: "Lorsqu'une partie est absente, la partie présente peut prolonger l'attente ou clôturer la mission selon les options disponibles." },
  { title: 'Réclamation par formulaire', text: "Toute contestation doit être effectuée via le formulaire prévu dans l'application. Les décisions peuvent être contestées après traitement." },
  { title: 'Frais encadrés', text: "Les frais d'annulation dépendent du moment de l'annulation, de la partie concernée et de la responsabilité constatée." },
  { title: 'Paiement selon le protocole', text: "Le paiement du vendeur, la rémunération du cotransporteur et le remboursement de l'acheteur sont déclenchés selon la présence des parties et les règles du protocole." },
  { title: 'Colis remis = mission engagée', text: 'Une fois le colis remis au cotransporteur, la mission ne peut plus être annulée ou modifiée volontairement.' },
  { title: 'Contrôle du colis', text: "Le cotransporteur peut refuser le colis lors de la collecte si celui-ci n'est pas conforme ou ne peut pas être transporté correctement." },
  { title: 'Traçabilité complète', text: "Chaque action laisse une trace dans l'application : présence, absence, clôture, annulation, formulaire, réclamation, décision support et paiement." },
];

const FINAL_BLOCK: string[] = [
  "Les décisions sont appliquées selon les preuves disponibles dans l'application : présence au hub, validations, scans, horaires, clôture de mission, formulaires et réclamations.",
  'En cas de blocage ou de contestation, le dossier peut être transmis au support HandtoHand pour décision.',
  "Après décision, les parties concernées peuvent contester via le formulaire prévu dans l'application.",
];

export default function IncidentsProtocolScreen() {
  const { colors } = useColorScheme();

  const toneColor = (tone: Tone): string =>
    tone === 'danger' ? colors.error : tone === 'support' ? colors.primary : colors.warningDark;

  return (
    <SafeAreaWrapper>
      <Header title="Protocole incidents" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Icon name="shield" size={12} color={colors.primary} />
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>H2H Logistic</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Règles de présence, d’annulation et de réclamation</Text>
          {INTRO.map((p, i) => (
            <Text key={i} style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{p}</Text>
          ))}
        </View>

        {/* Lecture rapide */}
        <Card style={{ backgroundColor: colors.primary + '06' }}>
          <View style={styles.legendHeader}>
            <Icon name="info" size={14} color={colors.primary} />
            <Text style={[styles.legendTitle, { color: colors.text }]}>Lecture rapide</Text>
          </View>
          <View style={styles.legendList}>
            {LECTURE_RAPIDE.map((item, i) => (
              <View key={i} style={styles.legendItem}>
                <Text style={[styles.legendItemTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.legendItemText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Validation de présence au hub (règle fondatrice) */}
        <Card style={{ backgroundColor: colors.primary + '06' }}>
          <View style={styles.legendHeader}>
            <Icon name="location-filled" size={14} color={colors.primary} />
            <Text style={[styles.legendTitle, { color: colors.text }]}>{PRESENCE_RULE.title}</Text>
          </View>
          <Text style={[styles.scText, { color: colors.text }]}>{PRESENCE_RULE.intro}</Text>
          <Text style={[styles.scText, { color: colors.textSecondary, marginTop: Spacing.xs }]}>{PRESENCE_RULE.concerneLead}</Text>
          {PRESENCE_RULE.concerne.map((c, i) => (
            <View key={`c${i}`} style={styles.scBulletRow}>
              <View style={[styles.scBulletDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.scBulletText, { color: colors.textSecondary }]}>{c}</Text>
            </View>
          ))}
          {PRESENCE_RULE.blocks.map((block, bi) => (
            <View key={bi} style={styles.scSection}>
              <Text style={[styles.scLabel, { color: colors.textSecondary }]}>{block.title.toUpperCase()}</Text>
              {block.paragraphs?.map((p, i) => (
                <Text key={`p${i}`} style={[styles.scText, { color: colors.textSecondary }]}>{p}</Text>
              ))}
              {block.lead && <Text style={[styles.scText, { color: colors.textSecondary }]}>{block.lead}</Text>}
              {block.bullets?.map((b, i) => (
                <View key={`b${i}`} style={styles.scBulletRow}>
                  <View style={[styles.scBulletDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.scBulletText, { color: colors.textSecondary }]}>{b}</Text>
                </View>
              ))}
              {block.trailing?.map((p, i) => (
                <Text key={`t${i}`} style={[styles.scText, { color: colors.textSecondary }]}>{p}</Text>
              ))}
            </View>
          ))}
        </Card>

        {/* Scénarios */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Scénarios d’incidents</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{SCENARIOS_INTRO}</Text>
        </View>

        {SCENARIOS.map((sc) => {
          const tc = toneColor(sc.tone);
          return (
            <Card key={sc.number} style={{ borderColor: tc + '30', borderWidth: 1 }}>
              <View style={styles.scHeader}>
                <View style={[styles.scNumber, { backgroundColor: tc + '14', borderColor: tc + '40' }]}>
                  <Text style={[styles.scNumberText, { color: tc }]}>{sc.number}</Text>
                </View>
                <View style={[styles.scBadge, { backgroundColor: tc + '14' }]}>
                  <Icon name="shield" size={12} color={tc} />
                  <Text style={[styles.scBadgeText, { color: tc }]}>{sc.badge}</Text>
                </View>
              </View>
              <Text style={[styles.scTitle, { color: colors.text }]}>{sc.title}</Text>

              {sc.sections.map((section, si) => (
                <View key={si} style={styles.scSection}>
                  <Text style={[styles.scLabel, { color: colors.textSecondary }]}>{section.label.toUpperCase()}</Text>
                  {section.paragraphs?.map((p, pi) => (
                    <Text key={`p${pi}`} style={[styles.scText, { color: colors.text }]}>{p}</Text>
                  ))}
                  {section.button && (
                    <View style={[styles.scButton, { backgroundColor: colors.error }]}>
                      <Text style={styles.scButtonText}>{section.button}</Text>
                    </View>
                  )}
                  {section.lead && (
                    <Text style={[styles.scText, { color: colors.text }]}>{section.lead}</Text>
                  )}
                  {section.bullets?.map((b, bi) => (
                    <View key={`b${bi}`} style={styles.scBulletRow}>
                      <View style={[styles.scBulletDot, { backgroundColor: tc }]} />
                      <Text style={[styles.scBulletText, { color: colors.textSecondary }]}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </Card>
          );
        })}

        {/* Principes */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Principes du protocole</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{PRINCIPLES_SUBTEXT}</Text>
        </View>

        {PRINCIPLES.map((p, i) => (
          <Card key={i} style={{ backgroundColor: colors.primary + '06' }}>
            <View style={styles.principleHeader}>
              <View style={[styles.principleIcon, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.principleNum, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.principleTitle, { color: colors.text }]}>{p.title}</Text>
            </View>
            <Text style={[styles.principleText, { color: colors.textSecondary }]}>{p.text}</Text>
          </Card>
        ))}

        {/* Final block */}
        <View style={[styles.finalBlock, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
          <Icon name="shield" size={16} color={colors.primary} />
          <View style={{ flex: 1, gap: Spacing.sm }}>
            {FINAL_BLOCK.map((p, i) => (
              <Text key={i} style={[styles.finalText, { color: colors.textSecondary }]}>{p}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.section, paddingHorizontal: Spacing.lg },

  hero: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  heroBadgeText: { ...Typography.caption, fontFamily: 'Poppins_600SemiBold', fontSize: 11, letterSpacing: 0.4 },
  heroTitle: { ...Typography.h1, fontSize: 22, lineHeight: 30 },
  heroSubtitle: { ...Typography.body, lineHeight: 22 },

  legendHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  legendTitle: { ...Typography.bodyMedium },
  legendList: { gap: Spacing.md },
  legendItem: { gap: 2 },
  legendItemTitle: { ...Typography.captionMedium },
  legendItemText: { ...Typography.caption, lineHeight: 18 },

  sectionHeader: { gap: 4, paddingTop: Spacing.sm },
  sectionTitle: { ...Typography.h2 },
  sectionHint: { ...Typography.caption, lineHeight: 18 },

  scHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  scNumber: { width: 34, height: 34, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scNumberText: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  scBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, flexShrink: 1 },
  scBadgeText: { ...Typography.caption, fontFamily: 'Poppins_600SemiBold', fontSize: 11, flexShrink: 1 },
  scTitle: { ...Typography.h3, marginBottom: Spacing.sm },

  scSection: { gap: Spacing.xs, marginTop: Spacing.md },
  scLabel: { ...Typography.caption, fontSize: 10, letterSpacing: 0.6, fontFamily: 'Poppins_600SemiBold' },
  scText: { ...Typography.body, lineHeight: 21 },
  scBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  scBulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  scBulletText: { ...Typography.body, lineHeight: 21, flex: 1 },
  scButton: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginVertical: 2 },
  scButtonText: { ...Typography.captionMedium, color: '#FFFFFF' },

  principleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  principleIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  principleNum: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
  principleTitle: { ...Typography.bodyMedium, flex: 1 },
  principleText: { ...Typography.caption, lineHeight: 18 },

  finalBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.xs },
  finalText: { ...Typography.caption, lineHeight: 18 },
});
