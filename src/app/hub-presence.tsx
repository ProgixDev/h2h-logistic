import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Section {
  iconName: IconName;
  title: string;
  body: string[];
}

const INTRO: string[] = [
  "Le bouton « Je suis au hub » permet de déclarer officiellement votre présence au lieu de rendez-vous pendant le créneau prévu.",
  "Cette validation est importante : elle permet à H2H Logistic d'enregistrer votre heure de présence, de vérifier votre position dans la zone du hub et de faciliter la rencontre avec l'autre partie.",
  "Elle peut aussi servir de preuve en cas de retard, d'absence, de blocage ou de réclamation.",
];

const SECTIONS: Section[] = [
  {
    iconName: 'checkmark-circle',
    title: 'Le bouton « Je suis au hub »',
    body: [
      "Appuyez sur ce bouton uniquement lorsque vous êtes réellement arrivé au hub ou au point de rendez-vous prévu.",
      "Cette action permet de déclarer votre présence à l'heure du rendez-vous.",
    ],
  },
  {
    iconName: 'time',
    title: 'Quand utiliser ce bouton ?',
    body: [
      "Pendant le créneau horaire prévu, chaque partie doit appuyer sur « Je suis au hub » dès son arrivée au point de rendez-vous.",
      "Cette étape concerne :",
      "•  le vendeur et le cotransporteur au moment de la collecte du colis ;",
      "•  l'acheteur et le cotransporteur au moment de la remise du colis.",
      "Il est recommandé d'arriver 10 minutes avant l'heure prévue afin d'être prêt à valider votre présence dans l'application.",
      "Une tolérance maximale de 10 minutes après l'heure du rendez-vous peut être appliquée. Passé ce délai, une absence peut être retenue selon le protocole H2H Logistic.",
    ],
  },
  {
    iconName: 'shield',
    title: 'Pourquoi ce bouton est important ?',
    body: [
      "Le bouton « Je suis au hub » permet de confirmer que vous êtes présent au rendez-vous. Cette validation sert à :",
      "•  déclarer votre présence dans l'application ;",
      "•  enregistrer l'heure de votre arrivée ;",
      "•  vérifier que vous êtes bien dans la zone du hub ;",
      "•  afficher la carte du hub ;",
      "•  faciliter la rencontre avec l'autre partie ;",
      "•  protéger votre position en cas d'absence ou de retard de l'autre partie ;",
      "•  fournir une preuve en cas de réclamation.",
      "Sans validation de votre présence dans l'application, H2H Logistic peut ne pas être en mesure de confirmer que vous étiez bien présent au rendez-vous.",
    ],
  },
  {
    iconName: 'map-overview',
    title: 'Affichage de la carte',
    body: [
      "Lorsqu'une première partie appuie sur « Je suis au hub », la carte du hub s'affiche dans l'application.",
      "La présence de cette personne est enregistrée, mais sa position GPS n'est pas visible par l'autre partie tant que celle-ci n'a pas également appuyé sur « Je suis au hub ».",
    ],
  },
  {
    iconName: 'location-filled',
    title: 'Visibilité des positions GPS',
    body: [
      "Les positions GPS deviennent visibles uniquement lorsque les deux conditions suivantes sont réunies :",
      "1.  les deux parties ont appuyé sur « Je suis au hub » ;",
      "2.  les deux positions sont détectées dans la zone du hub.",
      "Une fois ces conditions réunies, chaque partie peut voir la position de l'autre sur la carte afin de se retrouver plus facilement.",
    ],
  },
  {
    iconName: 'lock',
    title: 'Confidentialité GPS',
    body: [
      "Votre position GPS est utilisée uniquement pour faciliter la rencontre au hub pendant le créneau de rendez-vous.",
      "Votre position ne devient visible par l'autre partie que si :",
      "•  vous avez appuyé sur « Je suis au hub » ;",
      "•  l'autre partie a aussi appuyé sur « Je suis au hub » ;",
      "•  vous êtes tous les deux détectés dans la zone du hub.",
      "Si une seule partie appuie sur « Je suis au hub », sa position GPS n'est pas partagée.",
      "Si une partie appuie sur « Je suis au hub » mais n'est pas détectée dans la zone du hub, sa position n'est pas affichée à l'autre partie.",
    ],
  },
];

type Tone = 'primary' | 'success' | 'warning' | 'error';

interface StateMessage {
  tone: Tone;
  title: string;
  body: string[];
}

const MESSAGES: StateMessage[] = [
  {
    tone: 'primary',
    title: 'Le bouton sera disponible au début du créneau',
    body: [
      "Vous pourrez déclarer votre présence en appuyant sur « Je suis au hub » dès l'ouverture du créneau de rendez-vous.",
      "Il est recommandé d'arriver 10 minutes avant l'heure prévue afin d'être prêt à valider votre présence dans l'application.",
    ],
  },
  {
    tone: 'success',
    title: 'Présence enregistrée',
    body: [
      "Votre présence au hub a été enregistrée. Cette validation confirme que vous avez déclaré être présent au rendez-vous dans l'application.",
      "La position de l'autre partie apparaîtra uniquement lorsqu'elle aura également appuyé sur « Je suis au hub » et que sa position sera détectée dans la zone du hub.",
    ],
  },
  {
    tone: 'primary',
    title: "En attente de l'autre partie",
    body: [
      "Votre présence a bien été enregistrée.",
      "La position de l'autre partie sera visible uniquement lorsqu'elle aura également déclaré sa présence au hub.",
    ],
  },
  {
    tone: 'success',
    title: 'Les deux parties sont au hub',
    body: [
      "Les deux présences ont été validées.",
      "Les positions GPS sont maintenant visibles sur la carte afin de faciliter la rencontre au point de rendez-vous.",
    ],
  },
  {
    tone: 'warning',
    title: 'Position hors zone du hub',
    body: [
      "Votre présence ne peut pas encore être validée. Rapprochez-vous du hub indiqué sur la carte pour confirmer votre présence.",
      "Votre position ne sera pas visible par l'autre partie tant que vous n'êtes pas détecté dans la zone du hub.",
    ],
  },
  {
    tone: 'error',
    title: 'Tolérance dépassée',
    body: [
      "La tolérance maximale de 10 minutes après l'heure du rendez-vous est dépassée.",
      "Si une partie n'a pas déclaré sa présence, une absence peut être retenue selon le protocole H2H Logistic.",
      "La partie présente peut alors suivre les options proposées dans l'application.",
    ],
  },
];

const RULES: string[] = [
  "Ce bouton sert à déclarer votre présence au rendez-vous.",
  "Pas de clic « Je suis au hub » = présence non déclarée dans l'application.",
  "Pas de double validation = pas de position GPS partagée.",
  "Double validation + présence dans la zone du hub = positions visibles sur la carte.",
];

export default function HubPresenceScreen() {
  const { colors } = useColorScheme();

  const toneColor = (tone: Tone): string =>
    tone === 'success' ? colors.success
    : tone === 'warning' ? colors.warning
    : tone === 'error' ? colors.error
    : colors.primary;

  return (
    <SafeAreaWrapper>
      <Header title="Déclarer ma présence au hub" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBlock}>
          {INTRO.map((p, i) => (
            <Text key={i} style={[styles.intro, { color: colors.textSecondary }]}>{p}</Text>
          ))}
        </View>

        {/* Explainer sections */}
        {SECTIONS.map((section, idx) => (
          <Card key={idx} style={{ backgroundColor: colors.primary + '06' }}>
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                <Icon name={section.iconName} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{section.title}</Text>
            </View>
            <View style={styles.body}>
              {section.body.map((p, i) => (
                <Text key={i} style={[styles.paragraph, { color: colors.textSecondary }]}>{p}</Text>
              ))}
            </View>
          </Card>
        ))}

        {/* Situation messages */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Les messages selon la situation</Text>
        {MESSAGES.map((m, idx) => {
          const c = toneColor(m.tone);
          return (
            <View
              key={idx}
              style={[styles.messageCard, { backgroundColor: c + '0E', borderLeftColor: c }]}
            >
              <Text style={[styles.messageTitle, { color: c }]}>{m.title}</Text>
              {m.body.map((p, i) => (
                <Text key={i} style={[styles.messageBody, { color: colors.textSecondary }]}>{p}</Text>
              ))}
            </View>
          );
        })}

        {/* Simple rule */}
        <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '30', borderWidth: 1 }}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="info" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Règle simple</Text>
          </View>
          <View style={styles.body}>
            {RULES.map((r, i) => (
              <Text key={i} style={[styles.rule, { color: colors.text }]}>{r}</Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.section,
  },
  introBlock: { gap: Spacing.sm },
  intro: {
    ...Typography.body,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
    flex: 1,
  },
  body: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  paragraph: {
    ...Typography.body,
    lineHeight: 22,
  },
  sectionHeading: {
    ...Typography.h3,
    marginTop: Spacing.sm,
  },
  messageCard: {
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  messageTitle: {
    ...Typography.bodyMedium,
  },
  messageBody: {
    ...Typography.caption,
    lineHeight: 18,
  },
  rule: {
    ...Typography.body,
    lineHeight: 22,
  },
});
