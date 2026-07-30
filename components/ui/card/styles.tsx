import { tva, isWeb } from '@gluestack-ui/utils/nativewind-utils';
const baseStyle = isWeb ? 'flex flex-col relative z-0' : '';

export const cardStyle = tva({
  base: `${baseStyle} p-4 rounded-xl shadow-lg border border-outline-100 bg-background-50`,
  variants: {
    size: {
      sm: 'p-3 rounded-md',
      md: 'p-4 rounded-xl',
      lg: 'p-6 rounded-[18px]',
    },
    variant: {
      elevated: 'bg-background-0 shadow-lg border-outline-100',
      outline: 'bg-background-0 border border-outline-200 shadow-sm',
      ghost: 'bg-transparent rounded-none shadow-none',
      filled: 'bg-background-50 shadow-sm',
    },
  },
});
