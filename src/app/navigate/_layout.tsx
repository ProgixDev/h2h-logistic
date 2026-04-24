import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function NavigateLayout() {
  const { colors } = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: false,
      }}
    />
  );
}
