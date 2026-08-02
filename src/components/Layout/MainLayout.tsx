import {
  ListBulletIcon as SolidListBulletIcon,
  ReceiptPercentIcon as SolidReceiptIcon,
  UserCircleIcon as SolidUserCircleIcon,
} from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { SOLO_GROUP_LINK } from '~/lib/soloGroup';
import { LoadingSpinner } from '../ui/spinner';

interface MainLayoutProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  header?: React.ReactNode;
  loading?: boolean;
  hideAppBar?: boolean;
}

const NAV_ITEMS = [
  { key: 'expenses', link: SOLO_GROUP_LINK, match: '/groups', Icon: SolidReceiptIcon },
  { key: 'activity', link: '/activity', match: '/activity', Icon: SolidListBulletIcon },
  { key: 'account', link: '/account', match: '/account', Icon: SolidUserCircleIcon },
] as const;

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  actions,
  hideAppBar,
  title,
  loading,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <div className="bg-background h-full w-full">
      <div
        vaul-drawer-wrapper=""
        className={clsx(
          'bg-background mx-auto flex h-full w-full flex-col lg:max-w-3xl lg:flex-row',
          hideAppBar ? '' : '',
        )}
      >
        <nav className="item-center -ml-[170px] hidden w-[170px] px-4 py-4 lg:flex lg:flex-col lg:gap-2">
          <Link href={SOLO_GROUP_LINK} className="mb-8 flex items-center gap-2">
            <span className="text-xl font-medium">
              {t?.('meta.application_name') ?? 'SplitPro'}
            </span>
          </Link>
          {NAV_ITEMS.map(({ key, link, match, Icon }) => (
            <NavItemDesktop
              key={key}
              title={t?.(`navigation.${key}`) ?? key}
              Icon={Icon}
              link={link}
              match={match}
              currentPath={currentPath}
            />
          ))}
        </nav>
        <div
          className="w-full overflow-auto lg:border-x lg:border-gray-900 lg:px-6"
          id="mainlayout"
        >
          {title ? (
            <div className="mb-2 flex items-center justify-between px-4 py-4">
              <div className="text-foreground text-3xl font-bold">{title}</div>
              {actions}
            </div>
          ) : null}
          <div className="px-4">
            {loading ? (
              <div className="mt-10 flex justify-center">
                <LoadingSpinner className="text-primary" />
              </div>
            ) : (
              children
            )}
          </div>
          <div className="h-28 lg:h-0" />
        </div>
      </div>

      <nav className="liquid-glass liquid-glass--nav fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] mx-auto flex max-w-md justify-between gap-1 rounded-full p-1.5 lg:hidden">
        {NAV_ITEMS.map(({ key, link, match, Icon }) => (
          <NavItem
            key={key}
            title={t?.(`navigation.${key}`) ?? key}
            Icon={Icon}
            link={link}
            match={match}
            currentPath={currentPath}
          />
        ))}
      </nav>
    </div>
  );
};

interface NavItemProps {
  title: string;
  Icon: LucideIcon;
  link: string;
  currentPath?: string;
  match?: string;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;

const NavItem: React.FC<NavItemProps> = ({ title, Icon, link, currentPath, match }) => {
  const isActive = currentPath?.startsWith(match ?? link);

  return (
    <Link
      href={link}
      aria-current={isActive ? 'page' : undefined}
      className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2"
    >
      {isActive && (
        <motion.span
          layoutId="nav-pill"
          transition={SPRING}
          className="liquid-glass-pill absolute inset-0 rounded-full"
        />
      )}
      <motion.span
        className="relative z-10 flex flex-col items-center gap-1"
        animate={{ scale: isActive ? 1 : 0.95 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING}
      >
        <Icon className={clsx('size-5.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span
          className={clsx(
            'max-w-full truncate text-[0.68rem] leading-none font-medium',
            isActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {title}
        </span>
      </motion.span>
    </Link>
  );
};

const NavItemDesktop: React.FC<NavItemProps> = ({ title, Icon, link, currentPath, match }) => {
  const isActive = currentPath?.startsWith(match ?? link);

  return (
    <Link href={link} className={clsx('flex w-[150px] items-center gap-2 py-4')}>
      <Icon className={clsx('h-7 w-7', isActive ? 'text-primary' : 'text-muted-foreground')} />
      <span
        className={clsx(
          'capitalize',
          isActive ? 'text-primary font-medium' : 'text-muted-foreground',
        )}
      >
        {title}
      </span>
    </Link>
  );
};
export default MainLayout;
