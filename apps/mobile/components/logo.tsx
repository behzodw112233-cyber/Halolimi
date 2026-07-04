import { cn, Typography } from 'heroui-native';
import { Text } from 'react-native';

/** Halolmi wordmark — big Fredoka "H" + lowercase rest. */
export function Logo({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Typography className={cn('text-white', className)}>
      <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: size * 1.44 }}>
        H
      </Text>
      <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: size }}>
        alolmi
      </Text>
    </Typography>
  );
}
