import { motion } from 'framer-motion';
import { forwardRef } from 'react';

/**
 * DEEP OCEAN THEME - BUTTON COMPONENT
 * Advanced animated buttons with ocean gradients
 */

const Button = forwardRef(({
  children,
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg, xl
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left', // left, right
  fullWidth = false,
  animate = true,
  onClick,
  ...props
}, ref) => {
  
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-ocean-950';

  // Variant styles
  const variantClasses = {
    primary: 'bg-gradient-to-r from-ocean-600 to-cyan-500 text-white shadow-ocean-md hover:shadow-ocean-lg hover:from-ocean-500 hover:to-cyan-400 active:scale-95',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 active:scale-95',
    outline: 'bg-transparent text-white border-2 border-cyan-400 hover:bg-cyan-400/10 active:scale-95',
    ghost: 'bg-transparent text-white hover:bg-white/10 active:scale-95',
    danger: 'bg-gradient-to-r from-danger-600 to-danger-500 text-white shadow-ocean-md hover:shadow-ocean-lg hover:from-danger-500 hover:to-danger-400 active:scale-95',
  };

  // Size styles
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-md',
    md: 'text-sm px-4 py-2.5 rounded-lg',
    lg: 'text-base px-6 py-3 rounded-lg',
    xl: 'text-lg px-8 py-4 rounded-xl',
  };

  // Icon size based on button size
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${disabledClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      y: -2,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const ButtonComponent = animate ? motion.button : 'button';
  const animationProps = animate ? {
    variants: buttonVariants,
    initial: "initial",
    whileHover: (disabled || loading) ? undefined : "hover",
    whileTap: (disabled || loading) ? undefined : "tap"
  } : {};

  return (
    <ButtonComponent
      ref={ref}
      className={combinedClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      {loading && (
        <LoadingSpinner size={size} className={Icon || iconPosition === 'left' ? 'mr-2' : ''} />
      )}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={`${iconSizes[size]} mr-2`} strokeWidth={2.5} />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={`${iconSizes[size]} ml-2`} strokeWidth={2.5} />
      )}
    </ButtonComponent>
  );
});

Button.displayName = 'Button';

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="loading-spinner h-full w-full" />
    </div>
  );
}

/**
 * Icon Button - Compact button with just an icon
 */
export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size]} strokeWidth={2.5} />
    </Button>
  );
}

/**
 * Button Group - Group multiple buttons together
 */
export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg shadow-ocean-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/**
 * FAB - Floating Action Button
 */
export function FloatingActionButton({
  icon: Icon,
  position = 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  onClick,
  className = '',
  ...props
}) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-8 right-8',
    'bottom-left': 'fixed bottom-8 left-8',
    'top-right': 'fixed top-8 right-8',
    'top-left': 'fixed top-8 left-8',
  };

  return (
    <motion.button
      className={`
        ${positionClasses[position]}
        bg-gradient-to-br from-ocean-600 to-cyan-500
        text-white
        p-4 rounded-full
        shadow-ocean-2xl
        hover:shadow-glow-cyan
        z-50
        ${className}
      `}
      whileHover={{ scale: 1.1, rotate: 90 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      {...props}
    >
      <Icon className="h-6 w-6" strokeWidth={2.5} />
    </motion.button>
  );
}

export default Button;