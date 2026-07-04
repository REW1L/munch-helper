import React from 'react';
import { Text, type TextProps } from 'react-native';

/**
 * Shared label for buttons. Keeps localized text on a single line by shrinking
 * the font to fit rather than wrapping to a second line, down to a readability
 * floor (75% of the base size); below that the label truncates. Every button —
 * the shared VioletButton and inline button styles alike — renders its label
 * through this component so the single-line policy is identical everywhere.
 */
export default function ButtonLabel({ children, style, ...rest }: TextProps) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={style}
      {...rest}
    >
      {children}
    </Text>
  );
}
