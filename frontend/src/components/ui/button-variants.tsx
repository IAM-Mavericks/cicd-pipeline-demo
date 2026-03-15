import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline active:scale-95',
        neon: 'bg-black/40 backdrop-blur-md border-2 border-purple-500/50 text-white hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300 active:scale-95',
        'neon-gradient': 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 backdrop-blur-md border-2 border-transparent bg-clip-padding hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300 relative before:absolute before:inset-0 before:rounded-md before:p-[2px] before:bg-gradient-to-br before:from-purple-500 before:via-pink-500 before:to-cyan-500 before:-z-10 active:scale-95',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        'icon-lg': 'h-14 w-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
