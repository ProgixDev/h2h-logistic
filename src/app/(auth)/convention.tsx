import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SignaturePad } from '@/components/ui/SignaturePad';
import { Typography } from '@/constants/Typography';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  CONVENTION_TRANSPORTEUR_FR,
  CONVENTION_TRANSPORTEUR_VERSION,
} from '@/constants/ConventionTransporteur';

const REQUIRED_MENTION = 'lu et approuvé';

type ConventionState = {
  scrollProgress: number;
  agreementScrolled: boolean;
  representative: string;
  wantsBankTransfer: boolean;
  iban: string;
  agreementRead: boolean;
  agreementAccepted: boolean;
  debitAuthorized: boolean;
  readApprovedMention: string;
  signatureData: string;
};

const initialState: ConventionState = {
  scrollProgress: 0,
  agreementScrolled: false,
  representative: '',
  wantsBankTransfer: false,
  iban: '',
  agreementRead: false,
  agreementAccepted: false,
  debitAuthorized: false,
  readApprovedMention: '',
  signatureData: '',
};

const formatIban = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean;
};

export default function ConventionScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveConventionAcceptance, isLoading, user } = useAuthStore();

  const [state, setState] = useState<ConventionState>(initialState);
  const [signing, setSigning] = useState(false);
  const conventionScrollRef = useRef<ScrollView>(null);

  const handleConventionScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
    const progress = Math.min(1, Math.max(0, contentOffset.y / scrollable));
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setState((d) => {
      const nextScrolled = d.agreementScrolled || distanceFromBottom < 24;
      if (d.agreementScrolled === nextScrolled && progress === d.scrollProgress)
        return d;
      return { ...d, scrollProgress: progress, agreementScrolled: nextScrolled };
    });
  };

  const mentionOk =
    state.readApprovedMention.trim().toLowerCase() === REQUIRED_MENTION;
  const mentionTouched = state.readApprovedMention.length > 0;
  const ibanClean = state.iban.replace(/\s/g, '');
  const ibanFilled = ibanClean.length >= 14;
  const repFilled = state.representative.trim().length > 1;
  const identityOk = repFilled && (!state.wantsBankTransfer || ibanFilled);
  const authOk =
    state.agreementRead && state.agreementAccepted && state.debitAuthorized;
  const signatureOk = state.signatureData.length > 0 && mentionOk;

  const allValid =
    state.agreementScrolled && identityOk && authOk && signatureOk;

  const handleSubmit = useCallback(async () => {
    if (!allValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveConventionAcceptance({
      representative: state.representative,
      iban: ibanClean,
      wantsBankTransfer: state.wantsBankTransfer,
      debitAuthorized: state.debitAuthorized,
      signatureData: state.signatureData,
    });
    router.replace('/(tabs)');
  }, [allValid, state, ibanClean, saveConventionAcceptance, router]);

  const signedName =
    state.representative.trim() ||
    (user ? `${user.firstName} ${user.lastName}`.trim() : '');
  const signedDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.lg }}>
        <Header title="Convention transporteur" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!signing}
      >
        <Text style={[Typography.h1, { color: colors.text }]}>
          Acceptation de la convention
        </Text>
        <Text
          style={[Typography.body, { color: colors.textSecondary, marginTop: 4 }]}
        >
          Lisez la convention, complétez vos informations, autorisez le
          prélèvement des frais éventuels et signez pour finaliser votre
          inscription.
        </Text>

        {/* ── Status chips ───────────────────────────────────────── */}
        <View style={styles.chipBar}>
          <StatusChip label="Lu" done={state.agreementScrolled} />
          <StatusChip label="Identité" done={identityOk} />
          <StatusChip label="Autorisation" done={authOk} />
          <StatusChip label="Signature" done={signatureOk} />
        </View>

        {/* ── Section 1 · Document ──────────────────────────────── */}
        <SectionCard
          index={1}
          title="Convention de partenariat"
          subtitle="Faites défiler jusqu'au bas du document."
          done={state.agreementScrolled}
        >
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            Version {CONVENTION_TRANSPORTEUR_VERSION}
          </Text>

          <View
            style={[
              styles.conventionBox,
              {
                backgroundColor: colors.background,
                borderColor: state.agreementScrolled
                  ? colors.success
                  : colors.border,
              },
            ]}
          >
            <ScrollView
              ref={conventionScrollRef}
              style={styles.conventionScroll}
              contentContainerStyle={{ padding: Spacing.md }}
              onScroll={handleConventionScroll}
              scrollEventThrottle={32}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={[styles.conventionText, { color: colors.text }]}>
                {CONVENTION_TRANSPORTEUR_FR}
              </Text>
            </ScrollView>

            <View
              style={[
                styles.scrollProgressTrack,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.scrollProgressFill,
                  {
                    width: `${Math.round(
                      Math.max(
                        state.scrollProgress,
                        state.agreementScrolled ? 1 : 0,
                      ) * 100,
                    )}%`,
                    backgroundColor: state.agreementScrolled
                      ? colors.success
                      : colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.scrollHintRow}>
            <Feather
              name={state.agreementScrolled ? 'check-circle' : 'chevron-down'}
              size={14}
              color={
                state.agreementScrolled ? colors.success : colors.textSecondary
              }
            />
            <Text
              style={[
                Typography.caption,
                {
                  color: state.agreementScrolled
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            >
              {state.agreementScrolled
                ? 'Document lu jusqu’au bout.'
                : 'Faites défiler jusqu’en bas pour débloquer la suite.'}
            </Text>
          </View>
        </SectionCard>

        {/* ── Section 2 · Identity + IBAN ───────────────────────── */}
        <SectionCard
          index={2}
          title="Identité et paiement"
          subtitle="Le nom du représentant est obligatoire. L'IBAN n'est requis que pour les virements bancaires."
          done={identityOk}
        >
          <View style={{ gap: Spacing.md }}>
            <Input
              label="Nom et prénom du représentant"
              placeholder="Ex. Achraf Arabi"
              value={state.representative}
              onChangeText={(v) =>
                setState((d) => ({ ...d, representative: v }))
              }
              autoCapitalize="words"
            />

            <View
              style={[
                styles.toggleRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>
                  Je souhaite être payé par virement bancaire
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: colors.textSecondary, marginTop: 2 },
                  ]}
                >
                  Si activé, un IBAN valide est requis. Sinon vous pourrez le
                  renseigner plus tard depuis votre profil.
                </Text>
              </View>
              <Switch
                value={state.wantsBankTransfer}
                onValueChange={(v) =>
                  setState((d) => ({
                    ...d,
                    wantsBankTransfer: v,
                    iban: v ? d.iban : '',
                  }))
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {state.wantsBankTransfer && (
              <View>
                <Input
                  label="IBAN"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  value={state.iban}
                  onChangeText={(v) =>
                    setState((d) => ({ ...d, iban: formatIban(v) }))
                  }
                  autoCapitalize="characters"
                  maxLength={34}
                />
                <Text
                  style={[
                    Typography.caption,
                    { color: colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  Utilisé uniquement pour vous verser vos compensations.
                </Text>
              </View>
            )}
          </View>
        </SectionCard>

        {/* ── Section 3 · Debit authorization ───────────────────── */}
        <SectionCard
          index={3}
          title="Autorisation de débit"
          subtitle="Conformément à l'article 26 de la convention."
          done={authOk}
        >
          <View
            style={[
              styles.debitWarning,
              {
                backgroundColor: colors.warningLight,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <View style={styles.debitWarningHeader}>
              <Feather
                name="alert-triangle"
                size={16}
                color={colors.warningDark}
              />
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: colors.text, flex: 1 },
                ]}
              >
                Vous autorisez HandtoHand à prélever certains frais
              </Text>
            </View>
            <Text
              style={[
                Typography.caption,
                { color: colors.textSecondary, marginTop: 4 },
              ]}
            >
              En cas de manquement à la convention (annulation tardive, retour
              non effectué, remise hors procédure, faux signalement, abandon de
              mission, perte de colis…), HandtoHand peut imputer des frais
              opérationnels, des pénalités ou des remboursements sur vos
              compensations ou via prélèvement, dans les limites prévues à
              l'article 26.
            </Text>
          </View>

          {!state.agreementScrolled && (
            <View
              style={[
                styles.lockedBanner,
                { backgroundColor: `${colors.textSecondary}20` },
              ]}
            >
              <Feather name="lock" size={12} color={colors.textSecondary} />
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Faites défiler la convention pour débloquer.
              </Text>
            </View>
          )}

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <CheckboxRow
              checked={state.agreementRead}
              onToggle={() =>
                setState((d) => ({ ...d, agreementRead: !d.agreementRead }))
              }
              disabled={!state.agreementScrolled}
              label="J'ai lu et compris la convention dans son intégralité."
            />
            <CheckboxRow
              checked={state.agreementAccepted}
              onToggle={() =>
                setState((d) => ({
                  ...d,
                  agreementAccepted: !d.agreementAccepted,
                }))
              }
              disabled={!state.agreementScrolled}
              label="J'accepte sans réserve les obligations, procédures, plafonds et sanctions décrits."
            />
            <CheckboxRow
              checked={state.debitAuthorized}
              onToggle={() =>
                setState((d) => ({
                  ...d,
                  debitAuthorized: !d.debitAuthorized,
                }))
              }
              disabled={!state.agreementScrolled}
              label="J'autorise HandtoHand à prélever les frais et pénalités prévus à l'article 26."
              accent
            />
          </View>
        </SectionCard>

        {/* ── Section 4 · Signature ─────────────────────────────── */}
        <SectionCard
          index={4}
          title="Signature électronique"
          subtitle="Tapez la mention puis signez dans la zone."
          done={signatureOk}
          last
        >
          <View>
            <Input
              label="Recopiez la mention « lu et approuvé »"
              placeholder="lu et approuvé"
              value={state.readApprovedMention}
              onChangeText={(v) =>
                setState((d) => ({ ...d, readApprovedMention: v }))
              }
              autoCapitalize="none"
            />
            <View style={styles.mentionStatus}>
              <Feather
                name={
                  mentionTouched && !mentionOk
                    ? 'x-circle'
                    : mentionOk
                      ? 'check-circle'
                      : 'info'
                }
                size={12}
                color={
                  mentionTouched && !mentionOk
                    ? colors.error
                    : mentionOk
                      ? colors.success
                      : colors.textSecondary
                }
              />
              <Text
                style={[
                  Typography.caption,
                  {
                    color:
                      mentionTouched && !mentionOk
                        ? colors.error
                        : mentionOk
                          ? colors.success
                          : colors.textSecondary,
                  },
                ]}
              >
                {mentionTouched && !mentionOk
                  ? 'La mention exacte est « lu et approuvé ».'
                  : mentionOk
                    ? 'Mention correcte.'
                    : 'Tapez exactement « lu et approuvé ».'}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: Spacing.lg }}>
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.text },
              ]}
            >
              Signature
            </Text>
            <SignaturePad
              value={state.signatureData}
              onChange={(d) =>
                setState((prev) => ({ ...prev, signatureData: d }))
              }
              placeholder="Signez ici avec votre doigt"
              clearLabel="Effacer"
              height={180}
              onSigningStart={() => setSigning(true)}
              onSigningEnd={() => setSigning(false)}
            />
            <Text
              style={[
                Typography.caption,
                { color: colors.textSecondary, marginTop: 4 },
              ]}
            >
              Votre signature électronique vaut acceptation contractuelle.
            </Text>
          </View>

          {signatureOk && authOk && (
            <View
              style={[
                styles.readyBanner,
                {
                  backgroundColor: `${colors.success}15`,
                  borderColor: `${colors.success}55`,
                },
              ]}
            >
              <View style={styles.readyHeader}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: colors.text, flex: 1 },
                  ]}
                >
                  Tout est prêt à être enregistré
                </Text>
              </View>
              <Text
                style={[
                  Typography.caption,
                  { color: colors.textSecondary, marginTop: 4 },
                ]}
              >
                Vous pouvez finaliser votre inscription en bas de l'écran.
              </Text>
              <View style={styles.readyMeta}>
                <Text
                  style={[Typography.caption, { color: colors.textSecondary }]}
                >
                  Signé par ·{' '}
                  <Text style={{ color: colors.text }}>{signedName}</Text>
                </Text>
                <Text
                  style={[Typography.caption, { color: colors.textSecondary }]}
                >
                  Le {signedDate}
                </Text>
              </View>
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Button
          title="Accepter et finaliser"
          onPress={handleSubmit}
          variant="gradient"
          disabled={!allValid}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Helper components ────────────────────────────────────────────

function StatusChip({ label, done }: { label: string; done: boolean }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: done ? `${colors.success}18` : colors.surface,
          borderColor: done ? colors.success : colors.border,
        },
      ]}
    >
      <Feather
        name={done ? 'check' : 'circle'}
        size={11}
        color={done ? colors.success : colors.textSecondary}
      />
      <Text
        style={[
          Typography.caption,
          { color: done ? colors.success : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({
  index,
  title,
  subtitle,
  done,
  last,
  children,
}: {
  index: number;
  title: string;
  subtitle?: string;
  done: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: done ? colors.success : colors.border,
        },
        last ? null : styles.sectionGap,
      ]}
    >
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionBadge,
            {
              backgroundColor: done ? colors.success : colors.primary,
            },
          ]}
        >
          {done ? (
            <Feather name="check" size={12} color="#FFFFFF" />
          ) : (
            <Text style={styles.sectionBadgeText}>{index}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodyMedium, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                Typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function CheckboxRow({
  checked,
  onToggle,
  disabled,
  label,
  accent,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
  accent?: boolean;
}) {
  const { colors } = useColorScheme();
  const tint = accent ? colors.warningDark : colors.primary;
  return (
    <TouchableOpacity
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onToggle();
      }}
      activeOpacity={0.7}
      style={[styles.checkboxRow, disabled && { opacity: 0.45 }]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? tint : 'transparent',
            borderColor: checked ? tint : colors.border,
          },
        ]}
      >
        {checked && <Feather name="check" size={12} color="#FFFFFF" />}
      </View>
      <Text style={[Typography.caption, { color: colors.text, flex: 1 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
  },
  chipBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionGap: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: Spacing.md,
  },
  conventionBox: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  conventionScroll: {
    height: 260,
  },
  conventionText: {
    ...Typography.caption,
    lineHeight: 18,
  },
  scrollProgressTrack: {
    height: 3,
    width: '100%',
  },
  scrollProgressFill: {
    height: 3,
  },
  scrollHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  debitWarning: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  debitWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  mentionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  fieldLabel: {
    ...Typography.captionMedium,
    marginBottom: Spacing.xs,
  },
  readyBanner: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  readyMeta: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
