import { cn } from 'heroui-native';
import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

/**
 * Base text component wired to the app font. Use `className` for weight/size,
 * e.g. <AppText className="font-display text-2xl text-foreground" />.
 */
export const AppText = React.forwardRef<RNText, RNTextProps>((props, ref) => {
  const { className, ...restProps } = props;

  return (
    <RNText
      ref={ref}
      className={cn('font-normal text-foreground', className)}
      {...restProps}
    />
  );
});

AppText.displayName = 'AppText';
