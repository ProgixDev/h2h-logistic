import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PublishLayout() {
  const { colors } = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
