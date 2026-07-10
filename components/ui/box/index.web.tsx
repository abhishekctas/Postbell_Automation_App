import React from 'react';
import { boxStyle } from './styles';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

type IBoxProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof boxStyle> & { className?: string };

function normalizeStyle(style: unknown): React.CSSProperties | undefined {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>((acc, item) => {
      if (!item) return acc;
      if (Array.isArray(item)) {
        return { ...acc, ...normalizeStyle(item) };
      }
      return { ...acc, ...(item as React.CSSProperties) };
    }, {});
  }
  return style as React.CSSProperties;
}

const Box = React.forwardRef<HTMLDivElement, IBoxProps>(function Box(
  { className, style, ...props },
  ref
) {
  const normalizedStyle = normalizeStyle(style);

  return (
    <div
      ref={ref}
      className={boxStyle({ class: className })}
      style={normalizedStyle}
      {...props}
    />
  );
});

Box.displayName = 'Box';
export { Box };
