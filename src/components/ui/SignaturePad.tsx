import { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { Typography } from '@/constants/Typography';
import { BorderRadius } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';

type SignaturePadProps = {
  value: string;
  onChange: (combinedPath: string) => void;
  placeholder?: string;
  clearLabel?: string;
  height?: number;
  onSigningStart?: () => void;
  onSigningEnd?: () => void;
};

export function SignaturePad({
  value,
  onChange,
  placeholder = 'Signez ici',
  clearLabel = 'Effacer',
  height = 180,
  onSigningStart,
  onSigningEnd,
}: SignaturePadProps) {
  const { colors } = useColorScheme();

  const initialPaths = useMemo(
    () => (value ? value.split('|').filter(Boolean) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [currentPath, setCurrentPath] = useState('');

  const pathsRef = useRef<string[]>(initialPaths);
  const currentPathRef = useRef('');
  const onChangeRef = useRef(onChange);
  const onSigningStartRef = useRef(onSigningStart);
  const onSigningEndRef = useRef(onSigningEnd);
  onChangeRef.current = onChange;
  onSigningStartRef.current = onSigningStart;
  onSigningEndRef.current = onSigningEnd;

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture-phase claims keep an enclosing ScrollView from grabbing
        // the vertical drag and scrolling the page while the user signs.
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          // Dismiss keyboard before drawing so KeyboardAvoidingView doesn't
          // animate mid-stroke.
          Keyboard.dismiss();
          onSigningStartRef.current?.();
          const { locationX, locationY } = e.nativeEvent;
          const p = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
          currentPathRef.current = p;
          setCurrentPath(p);
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const next = `${currentPathRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
          currentPathRef.current = next;
          setCurrentPath(next);
        },
        onPanResponderRelease: () => {
          const finished = currentPathRef.current;
          currentPathRef.current = '';
          setCurrentPath('');
          onSigningEndRef.current?.();
          if (!finished) return;
          const nextPaths = [...pathsRef.current, finished];
          pathsRef.current = nextPaths;
          setPaths(nextPaths);
          onChangeRef.current(nextPaths.join('|'));
        },
        onPanResponderTerminate: () => {
          // System took the gesture (e.g. scroll claimed it). Restore scroll.
          currentPathRef.current = '';
          setCurrentPath('');
          onSigningEndRef.current?.();
        },
      }),
    [],
  );

  const isEmpty = paths.length === 0 && !currentPath;

  const clear = () => {
    pathsRef.current = [];
    currentPathRef.current = '';
    setPaths([]);
    setCurrentPath('');
    onChangeRef.current('');
  };

  return (
    <View>
      <View
        style={[
          styles.pad,
          {
            height,
            backgroundColor: colors.surface,
            borderColor: !isEmpty ? colors.primary : colors.border,
          },
        ]}
        {...responder.panHandlers}
      >
        <Svg
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill as object}
        >
          {paths.map((p, i) => (
            <Path
              key={`p-${i}`}
              d={p}
              stroke={colors.text}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={colors.text}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>

        <View
          pointerEvents="none"
          style={[styles.baseline, { borderBottomColor: colors.border }]}
        />
        <View pointerEvents="none" style={styles.baselineXWrap}>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>×</Text>
        </View>

        {isEmpty && (
          <View pointerEvents="none" style={styles.placeholderWrap}>
            <Feather name="edit-3" size={20} color={colors.textSecondary} />
            <Text
              style={[
                Typography.caption,
                { color: colors.textSecondary, marginTop: 4 },
              ]}
            >
              {placeholder}
            </Text>
          </View>
        )}
      </View>

      {!isEmpty && (
        <TouchableOpacity
          onPress={clear}
          style={styles.clearBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Feather name="rotate-ccw" size={12} color={colors.textSecondary} />
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            {clearLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseline: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  baselineXWrap: {
    position: 'absolute',
    left: 16,
    bottom: 18,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
});
