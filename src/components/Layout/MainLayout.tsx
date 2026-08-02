import {
  ListBulletIcon as SolidListBulletIcon,
  PlusCircleIcon as SolidPlusCircleIcon,
  UserCircleIcon as SolidUserCircleIcon,
  UserGroupIcon as SolidUserGroupIcon,
} from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import React from 'react';
import { SOLO_ADD_LINK, SOLO_GROUP_LINK } from '~/lib/soloGroup';
import { LoadingSpinner } from '../ui/spinner';

interface MainLayoutProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  header?: React.ReactNode;
  loading?: boolean;
  hideAppBar?: boolean;
}

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
          <NavItemDesktop
            title={t?.('navigation.groups') ?? 'Groups'}
            Icon={SolidUserGroupIcon}
            link={SOLO_GROUP_LINK}
            match="/groups"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title={t?.('navigation.add_expense') ?? 'Add Expense'}
            Icon={SolidPlusCircleIcon}
            link={SOLO_ADD_LINK}
            match="/add"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title={t?.('navigation.activity') ?? 'Activity'}
            Icon={SolidListBulletIcon}
            link="/activity"
            currentPath={currentPath}
          />
          <NavItemDesktop
            title={t?.('navigation.account') ?? 'Account'}
            Icon={SolidUserCircleIcon}
            link="/account"
            currentPath={currentPath}
          />
        </nav>
        <div
          className="w-full overflow-auto lg:border-x lg:border-gray-900 lg:px-6"
          id="mainlayout"
        >
          {title ? (
            <div className="mb-2 flex items-center justify-between px-4 py-4">
              <div className="text-3xl font-bold text-gray-200">{title}</div>
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

      <nav className="liquid-glass-nav fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] flex justify-between rounded-[1.75rem] px-1 lg:hidden">
        <NavItem
          title={t?.('navigation.groups') ?? 'Groups'}
          Icon={SolidUserGroupIcon}
          link={SOLO_GROUP_LINK}
          match="/groups"
          currentPath={currentPath}
        />
        <NavItem
          title={t?.('navigation.add') ?? 'Add'}
          Icon={SolidPlusCircleIcon}
          link={SOLO_ADD_LINK}
          match="/add"
          currentPath={currentPath}
        />
        <NavItem
          title={t?.('navigation.activity') ?? 'Activity'}
          Icon={SolidListBulletIcon}
          link="/activity"
          currentPath={currentPath}
        />
        <NavItem
          title={t?.('navigation.account') ?? 'Account'}
          Icon={SolidUserCircleIcon}
          link="/account"
          currentPath={currentPath}
        />
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

const NavItem: React.FC<NavItemProps> = ({ title, Icon, link, currentPath, match }) => {
  const isActive = currentPath?.startsWith(match ?? link);

  return (
    <Link
      href={link}
      className={clsx('flex w-32 flex-col items-center justify-between gap-2 py-4')}
    >
      <Icon className={clsx('h-7 w-7', isActive ? 'text-cyan-500' : 'text-gray-600')} />
      <span className={clsx('text-xs', isActive ? 'font-medium text-cyan-500' : 'text-gray-500')}>
        {title}
      </span>
    </Link>
  );
};

const NavItemDesktop: React.FC<NavItemProps> = ({ title, Icon, link, currentPath, match }) => {
  const isActive = currentPath?.startsWith(match ?? link);

  return (
    <Link href={link} className={clsx('flex w-[150px] items-center gap-2 py-4')}>
      <Icon className={clsx('h-7 w-7', isActive ? 'text-cyan-500' : 'text-gray-600')} />
      <span
        className={clsx('capitalize', isActive ? 'font-medium text-cyan-500' : 'text-gray-500')}
      >
        {title}
      </span>
    </Link>
  );
};
export default MainLayout;
