import { motion } from 'framer-motion';
import { forwardRef } from 'react';

/**
 * LIGHT THEME - CARD COMPONENTS
 * Clean cards with proper text contrast
 */

/**
 * Main Card Component
 */
export const Card = forwardRef(({ 
  children, 
  className = '', 
  hover = true,
  stacked = false,
  variant = 'default', // default, glass, glass-strong, glass-dark, solid
  animate = false,
  onClick,
  ...props 
}, ref) => {
  const baseClasses = 'rounded-xl transition-all duration-400 ease-smooth';
  
  const variantClasses = {
    default: 'modern-card',
    glass: 'glass p-6',
    'glass-strong': 'glass-strong p-6',
    'glass-dark': 'glass-dark p-6',
    solid: 'bg-white border border-gray-200 p-6',
  };

  const hoverClasses = hover 
    ? 'hover-lift cursor-pointer' 
    : '';

  const stackedClasses = stacked ? 'stacked-cards' : '';

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${hoverClasses}
    ${stackedClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    hover: {
      y: -6,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  if (animate) {
    return (
      <motion.div
        ref={ref}
        className={combinedClasses}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={hover ? "hover" : undefined}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      ref={ref}
      className={combinedClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

/**
 * Card Header Component
 */
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Body/Content Component
 */
export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Title Component
 */
export function CardTitle({ children, className = '', gradient = false }) {
  return (
    <h3 className={`
      text-lg font-semibold
      ${gradient ? 'gradient-text-primary' : 'text-gray-900'}
      ${className}
    `}>
      {children}
    </h3>
  );
}

/**
 * Card Description Component
 */
export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  );
}

/**
 * Stat Card - Light theme with readable text
 */
export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'brand',
  animate = true 
}) {
  const colorClasses = {
    brand: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'text-blue-600',
      value: 'text-blue-900',
      iconBg: 'bg-blue-100',
      icon: 'text-blue-600'
    },
    ocean: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: 'text-blue-600',
      value: 'text-blue-900',
      iconBg: 'bg-blue-100',
      icon: 'text-blue-600'
    },
    cyan: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      label: 'text-cyan-600',
      value: 'text-cyan-900',
      iconBg: 'bg-cyan-100',
      icon: 'text-cyan-600'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: 'text-green-600',
      value: 'text-green-900',
      iconBg: 'bg-green-100',
      icon: 'text-green-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: 'text-yellow-600',
      value: 'text-yellow-900',
      iconBg: 'bg-yellow-100',
      icon: 'text-yellow-600'
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'text-red-600',
      value: 'text-red-900',
      iconBg: 'bg-red-100',
      icon: 'text-red-600'
    },
  };

  const colors = colorClasses[color] || colorClasses.brand;

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
  };

  const CardWrapper = animate ? motion.div : 'div';
  const cardProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    whileHover: { y: -4, transition: { duration: 0.3 } }
  } : {};

  return (
    <CardWrapper className={`${colors.bg} border ${colors.border} rounded-xl p-6 shadow-sm`} {...cardProps}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-xs font-medium ${colors.label} uppercase tracking-wider mb-2`}>
            {label}
          </p>
          <p className={`text-3xl font-bold ${colors.value}`}>
            {value}
          </p>
          
          {trend && (
            <div className={`flex items-center mt-2 text-sm font-medium ${trendColors[trend]}`}>
              <span className="mr-1">{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`${colors.iconBg} p-3 rounded-xl`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} strokeWidth={2.5} />
          </div>
        )}
      </div>
    </CardWrapper>
  );
}

/**
 * Alert Card - Light theme notifications
 */
export function AlertCard({ 
  type = 'info', 
  title, 
  children, 
  icon: Icon, 
  onClose 
}) {
  const typeStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: 'text-green-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: 'text-red-600',
    },
  };

  const styles = typeStyles[type];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`${styles.bg} ${styles.border} border rounded-xl p-4`}
    >
      <div className="flex items-start">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${styles.icon}`} />
          </div>
        )}
        <div className={`${Icon ? 'ml-3' : ''} flex-1`}>
          {title && (
            <h3 className={`text-sm font-semibold ${styles.text}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles.text} ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Metric Card - Large display card for key metrics
 */
export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  animate = true 
}) {
  const CardWrapper = animate ? motion.div : 'div';
  const cardProps = animate ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  } : {};

  return (
    <CardWrapper className="modern-card p-8" {...cardProps}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <h2 className="text-4xl font-bold gradient-text-primary">
            {value}
          </h2>
        </div>
        {Icon && (
          <div className="bg-blue-100 p-3 rounded-xl">
            <Icon className="h-8 w-8 text-blue-600" strokeWidth={2} />
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">vs last period</span>
        </div>
      )}
    </CardWrapper>
  );
}

export default Card;