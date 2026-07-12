import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface RuleBlock {
  title: string;
  paragraphs?: string[];
  lead?: string;
  bullets?: string[];
  trailing?: string[];
}

interface RuleSection {
  number: number;
  title: string;
  concerne?: string[];
  blocks?: RuleBlock[];
  paragraphs?: string[];
}

const SECTIONS: RuleSection[] = [
  {
    number: 1,
    title: 'Règle commune aux formulaires 2 et 4',
    concerne: [
      'Formulaire 2 : acheteur absent au hub de remise, rempli par le cotransporteur.',
      "Formulaire 4 : cotransporteur absent au hub de remise, rempli par l'acheteur.",
    ],
    blocks: [
      {
        title: 'Fin de la tolérance',
        paragraphs: ["À la fin de la tolérance de 10 minutes, la personne présente dispose de 1 minute pour choisir une action dans l'application."],
        lead: 'Elle peut choisir entre :',
        bullets: ["prolonger l'attente ;", 'lancer la clôture de la mission.'],
      },
      {
        title: 'Prolongation possible',
        lead: "La personne présente peut prolonger l'attente jusqu'à 30 minutes maximum, sous forme de :",
        bullets: [
          'première prolongation de 10 minutes ;',
          'deuxième prolongation de 10 minutes ;',
          'troisième prolongation de 10 minutes.',
        ],
        trailing: [
          "Si aucune action n'est effectuée à la fin de la première ou de la deuxième prolongation de 10 minutes, la procédure de clôture est automatiquement lancée.",
          "Après 30 minutes maximum d'attente prolongée, la mission passe en procédure de clôture.",
        ],
      },
      {
        title: "Absence d'intervention après la tolérance",
        paragraphs: ["Si la personne présente ne choisit aucune action dans le délai de 1 minute après la fin de la tolérance, la procédure de clôture est automatiquement lancée."],
      },
      {
        title: 'Formulaire après lancement de la clôture',
        paragraphs: [
          'Lorsque la procédure de clôture est lancée, le formulaire correspondant est proposé à la personne présente.',
          'La personne présente dispose de 15 minutes pour remplir et envoyer le formulaire.',
          "Si aucun formulaire n'est rempli dans ce délai, le formulaire est automatiquement transmis au support HandtoHand avec les données disponibles dans l'application.",
        ],
      },
      {
        title: 'Analyse support',
        paragraphs: [
          "Le support HandtoHand commence son analyse après l'expiration du délai de contestation de 24 heures laissé à l'autre partie.",
          'Le support traite chaque dossier dans les meilleurs délais, à partir des preuves disponibles : horaires, présence au hub, validations, géolocalisation, scans, formulaires, photos et historique de mission.',
        ],
      },
      {
        title: 'Contestation de la décision plateforme',
        paragraphs: [
          'Après notification de la décision de la plateforme, chaque partie concernée dispose de 24 heures pour contester cette décision.',
          'Si une contestation est déposée dans ce délai, le support effectue une nouvelle analyse et rend une décision finale.',
          'Après cette décision finale, plus aucune réclamation ne sera possible.',
        ],
      },
    ],
  },
  {
    number: 2,
    title: 'Règle spécifique au formulaire 6',
    concerne: ["Formulaire 6 : absence ou blocage au hub de remise lorsque l'acheteur et le cotransporteur ne sont pas clairement présents."],
    blocks: [
      {
        title: 'Fin de la tolérance',
        paragraphs: [
          "À la fin de la tolérance, si aucune présence claire n'est validée et qu'aucune intervention n'est effectuée, la procédure liée au formulaire 6 est automatiquement lancée.",
          "Dans ce cas, aucune prolongation n'est prévue.",
        ],
      },
      {
        title: 'Délai pour remplir le formulaire 6',
        paragraphs: [
          'Les parties concernées disposent de 10 minutes pour remplir le formulaire 6.',
          "Ce formulaire permet de signaler une présence, une absence, un problème de géolocalisation, un problème technique ou une impossibilité de trouver l'autre partie.",
        ],
      },
      {
        title: 'Absence de formulaire dans le délai',
        paragraphs: [
          'Si aucun formulaire n\'est rempli dans le délai de 10 minutes, le dossier est automatiquement transmis au support HandtoHand.',
          "Le support traite le dossier dans les meilleurs délais à partir des informations disponibles dans l'application.",
        ],
      },
      {
        title: 'Décision plateforme',
        paragraphs: [
          'Après analyse, la plateforme notifie sa décision aux parties concernées.',
          'À compter de la notification de cette décision, les parties disposent de 24 heures pour contester.',
          'Passé ce délai, la décision devient définitive dans le cadre du protocole H2H Logistic.',
          'Si une contestation est déposée dans le délai, le support effectue une nouvelle analyse et rend une décision finale.',
          'Après cette décision finale, plus aucune réclamation ne sera possible.',
        ],
      },
    ],
  },
  {
    number: 3,
    title: 'Règle spécifique au formulaire 7',
    concerne: ['Formulaire 7 : vendeur absent au rendez-vous de collecte, rempli par le cotransporteur.'],
    blocks: [
      {
        title: 'Aucune prolongation possible',
        paragraphs: [
          "En cas d'absence du vendeur au rendez-vous de collecte après la tolérance autorisée, aucune prolongation n'est possible.",
          'La procédure de clôture est automatiquement lancée.',
        ],
      },
      {
        title: 'Formulaire proposé au cotransporteur',
        paragraphs: [
          'Le formulaire 7 est proposé au cotransporteur présent.',
          'Le cotransporteur dispose de 15 minutes pour remplir et envoyer le formulaire.',
        ],
      },
      {
        title: "Absence d'intervention",
        paragraphs: ["Si le cotransporteur ne remplit pas le formulaire dans le délai de 15 minutes, le formulaire est automatiquement transmis au support HandtoHand avec les données disponibles dans l'application."],
      },
      {
        title: 'Analyse support',
        paragraphs: [
          "Le support HandtoHand commence son analyse après l'expiration du délai de contestation de 24 heures laissé au vendeur.",
          'Le support traite chaque dossier dans les meilleurs délais.',
        ],
      },
      {
        title: 'Contestation de la décision plateforme',
        paragraphs: [
          'Après notification de la décision de la plateforme, chaque partie concernée dispose de 24 heures pour contester cette décision.',
          'Si une contestation est déposée dans ce délai, le support effectue une nouvelle analyse et rend une décision finale.',
          'Après cette décision finale, plus aucune réclamation ne sera possible.',
        ],
      },
    ],
  },
  {
    number: 4,
    title: 'Règle spécifique au formulaire 11',
    concerne: ['Formulaire 11 : refus du colis par le cotransporteur lors de la collecte.'],
    blocks: [
      {
        title: 'Refus du colis',
        paragraphs: [
          "Lors de la collecte, le cotransporteur peut refuser la co-livraison si le colis n'est pas conforme ou ne peut pas être transporté dans de bonnes conditions.",
          "Le cotransporteur doit remplir le formulaire 11 en précisant le motif du refus et, si possible, ajouter des preuves : photos du colis, de l'emballage ou de l'anomalie constatée.",
        ],
      },
      {
        title: 'Contestation par le vendeur',
        paragraphs: ['Le vendeur dispose de 24 heures à compter de la notification du refus du colis pour contester via le formulaire de contestation.'],
      },
      {
        title: 'Absence de contestation',
        paragraphs: [
          'Si le vendeur ne conteste pas dans le délai de 24 heures, le refus du colis devient effectif.',
          'La co-livraison est annulée selon le protocole H2H Logistic.',
        ],
      },
      {
        title: 'Contestation dans le délai',
        paragraphs: [
          'Si le vendeur conteste dans le délai de 24 heures, le dossier est transmis au support HandtoHand pour analyse.',
          "Le support examine les éléments disponibles : déclaration du cotransporteur, photos, description de l'annonce, format, poids, dimensions, emballage et tout élément transmis par le vendeur.",
        ],
      },
      {
        title: 'Décision support',
        paragraphs: [
          'Après analyse, le support notifie sa décision aux parties concernées.',
          'À compter de cette notification, chaque partie dispose de 24 heures pour contester la décision du support.',
        ],
      },
      {
        title: 'Décision finale',
        paragraphs: [
          'Si une contestation est déposée dans ce délai, le support effectue une nouvelle analyse et rend une décision finale.',
          'Après cette décision finale, plus aucune réclamation ne sera possible.',
          'Si aucune contestation n\'est déposée dans le délai de 24 heures, la première décision du support devient effective.',
        ],
      },
    ],
  },
  {
    number: 5,
    title: 'Règle générale de clôture définitive',
    paragraphs: [
      'Certaines déclarations, absences, refus ou décisions peuvent être contestés dans un délai de 24 heures à compter de leur notification.',
      "Lorsqu'une contestation est déposée dans le délai, le support HandtoHand analyse le dossier et rend une décision.",
      'Après notification de cette décision, les parties disposent de 24 heures pour contester.',
      'Si une seconde analyse est ouverte, le support rend une décision finale.',
      'Après cette décision finale, ou après expiration des délais de contestation, plus aucune réclamation ne sera possible dans le cadre du protocole H2H Logistic.',
      'Le support HandtoHand traite chaque dossier dans les meilleurs délais, en fonction des éléments disponibles et de la complexité de la situation.',
    ],
  },
  {
    number: 6,
    title: 'Règle simple à retenir',
    blocks: [
      {
        title: 'Si une seule partie est présente',
        lead: "On utilise le formulaire d'absence correspondant :",
        bullets: [
          'acheteur absent → formulaire 2 ;',
          'cotransporteur absent au hub de remise → formulaire 4 ;',
          'vendeur absent au rendez-vous de collecte → formulaire 7.',
        ],
      },
      {
        title: 'Si les deux parties ont cliqué « Je suis au hub » mais rien n’est finalisé',
        lead: 'On lance un formulaire de blocage :',
        bullets: [
          'hub de remise acheteur / cotransporteur → formulaire 6 ;',
          'hub de collecte ou prise en charge → formulaire 13.',
        ],
      },
      {
        title: 'Si personne ne clique « Je suis au hub »',
        lead: 'On lance aussi un formulaire de blocage :',
        bullets: ["formulaire 6 ou 13 selon l'étape concernée."],
      },
      {
        title: 'Si le colis est présenté mais non conforme',
        paragraphs: [
          'Le cotransporteur peut remplir le formulaire 11, mais uniquement pendant le créneau de collecte.',
          'Passé la tolérance sans prise en charge finalisée, le formulaire 11 disparaît et le formulaire 13 est lancé automatiquement.',
        ],
      },
    ],
  },
];

export default function DelaysRulesScreen() {
  const { colors } = useColorScheme();

  return (
    <SafeAreaWrapper>
      <Header title="Règles de délais" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroBadge, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Icon name="time" size={12} color={colors.primary} />
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>H2H Logistic</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Règles de délais et d’intervention</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {"Les délais d'intervention, de clôture et de contestation applicables à chaque formulaire. Les formulaires ne font que référencer ces règles."}
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <Card key={section.number} style={{ backgroundColor: colors.primary + '06' }}>
            <View style={styles.secHeader}>
              <View style={[styles.secNumber, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.secNumberText, { color: colors.primary }]}>{section.number}</Text>
              </View>
              <Text style={[styles.secTitle, { color: colors.text }]}>{section.title}</Text>
            </View>

            {section.concerne && (
              <View style={styles.concerne}>
                <Text style={[styles.concerneLabel, { color: colors.textSecondary }]}>CONCERNE</Text>
                {section.concerne.map((c, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.bulletText, { color: colors.text }]}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {section.paragraphs?.map((p, i) => (
              <Text key={`sp${i}`} style={[styles.sectionParagraph, { color: colors.textSecondary }]}>{p}</Text>
            ))}

            {section.blocks?.map((block, bi) => (
              <View key={bi} style={styles.block}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{block.title}</Text>
                {block.paragraphs?.map((p, i) => (
                  <Text key={`p${i}`} style={[styles.blockText, { color: colors.textSecondary }]}>{p}</Text>
                ))}
                {block.lead && <Text style={[styles.blockText, { color: colors.textSecondary }]}>{block.lead}</Text>}
                {block.bullets?.map((b, i) => (
                  <View key={`b${i}`} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{b}</Text>
                  </View>
                ))}
                {block.trailing?.map((p, i) => (
                  <Text key={`t${i}`} style={[styles.blockText, { color: colors.textSecondary }]}>{p}</Text>
                ))}
              </View>
            ))}
          </Card>
        ))}
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

  secHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  secNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secNumberText: { fontFamily: 'Poppins_700Bold', fontSize: 15 },
  secTitle: { ...Typography.h3, flex: 1 },

  concerne: { gap: Spacing.xs, marginBottom: Spacing.sm },
  concerneLabel: { ...Typography.caption, fontSize: 10, letterSpacing: 0.6, fontFamily: 'Poppins_600SemiBold' },

  sectionParagraph: { ...Typography.body, lineHeight: 21, marginBottom: Spacing.sm },

  block: { gap: Spacing.xs, marginTop: Spacing.md },
  blockTitle: { ...Typography.bodyMedium },
  blockText: { ...Typography.body, lineHeight: 21 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { ...Typography.body, lineHeight: 21, flex: 1 },
});
