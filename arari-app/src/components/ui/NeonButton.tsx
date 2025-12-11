import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from "@/components/ui/button"

interface NeonButtonProps extends ButtonProps {
    glowColor?: 'blue' | 'purple';
}

export function NeonButton({ children, className, glowColor = 'blue', variant = 'default', ...props }: NeonButtonProps) {
    return (
        <Button
            className={cn(
                "relative overflow-hidden font-bold tracking-wider transition-all duration-300 hover:scale-105 active:scale-95",
                // Base Neon Styles
                "border border-transparent bg-transparent",

                // Blue Glow Variant
                glowColor === 'blue' && [
                    "text-neon-blue border-neon-blue/50 dark:border-neon-blue/50",
                    "hover:bg-neon-blue/10 hover:shadow-neon-blue hover:border-neon-blue",
                    // Stronger shadow in light mode for visibility
                    "light:hover:shadow-[0_0_15px_rgba(0,242,234,0.6)]",
                    "after:absolute after:inset-0 after:rounded-md after:shadow-[0_0_10px_theme('colors.neon.blue')] after:opacity-0 hover:after:opacity-100 after:transition-opacity"
                ],

                // Purple Glow Variant
                glowColor === 'purple' && [
                    "text-neon-purple border-neon-purple/50 dark:border-neon-purple/50",
                    "hover:bg-neon-purple/10 hover:shadow-neon-purple hover:border-neon-purple",
                    "light:hover:shadow-[0_0_15px_rgba(189,0,255,0.6)]",
                ],

                // Solid Filled Variant
                variant === 'default' && glowColor === 'blue' && "bg-neon-blue text-black hover:bg-neon-blue/90 border-0",

                className
            )}
            variant={variant === 'default' ? 'ghost' : variant} // Override implementation detail
            {...props}
        >
            {children}
        </Button>
    );
}
