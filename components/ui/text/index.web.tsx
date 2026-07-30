import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { textStyle } from './styles';

type ITextProps = React.ComponentProps<'span'> & VariantProps<typeof textStyle>;

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

const Text = React.forwardRef<React.ComponentRef<'span'>, ITextProps>(function Text(
  {
    className,
    style,
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size = 'md',
    sub,
    italic,
    highlight,
    ...props
  }: { className?: string } & ITextProps,
  ref
) {
  const normalizedStyle = normalizeStyle(style);

  return (
    <span
      className={textStyle({
        isTruncated: isTruncated as boolean,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        size,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className,
      })}
      style={normalizedStyle}
      {...props}
      ref={ref}
    />
  );
});

Text.displayName = 'Text';

export { Text };
