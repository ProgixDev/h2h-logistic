import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RouteLayout() {
  const { colors } = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
