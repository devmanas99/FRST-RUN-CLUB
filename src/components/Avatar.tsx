import React, { useEffect, useState } from 'react';

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoURL,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoURL]);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase() || 'FR';

  const sizeClasses = {
    sm: 'w-9 h-9 text-[13px]',
    md: 'w-11 h-11 text-[15px]',
    lg: 'w-14 h-14 text-[20px]',
    xl: 'w-16 h-16 text-[24px]',
    '2xl': 'w-[88px] h-[88px] text-[30px]',
  }[size];

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL}
        alt={`${name} profile photo`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover shrink-0 border border-[var(--divider)] bg-[var(--card)] ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} initials avatar`}
      className={`${sizeClasses} rounded-full shrink-0 border border-[var(--divider)] bg-[var(--card)] text-[var(--text)] font-display flex items-center justify-center select-none ${className}`}
    >
      {initials}
    </div>
  );
};
