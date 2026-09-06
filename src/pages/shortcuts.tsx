import { ChevronLeftIcon } from 'lucide-react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import React, { useMemo } from 'react';

import { CreateShortcutToken } from '~/components/Account/Shortcuts/CreateShortcutToken';
import { ShortcutExpenseList } from '~/components/Account/Shortcuts/ShortcutExpenseList';
import { ShortcutSetupGuide } from '~/components/Account/Shortcuts/ShortcutSetupGuide';
import { ShortcutTokenList } from '~/components/Account/Shortcuts/ShortcutTokenList';
import MainLayout from '~/components/Layout/MainLayout';
import { env } from '~/env';
import type { NextPageWithUser } from '~/types';
import { customServerSideTranslations } from '~/utils/i18n/server';

const ShortcutsPage: NextPageWithUser<{ baseUrl: string }> = ({ baseUrl }) => {
  const { t } = useTranslation();

  const header = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Link href="/account">
          <ChevronLeftIcon className="mr-1 h-6 w-6" />
        </Link>
        <p className="text-lg font-normal">{t('shortcuts.title')}</p>
      </div>
    ),
    [t],
  );

  return (
    <>
      <Head>
        <title>{t('shortcuts.title')}</title>
      </Head>
      <MainLayout title={t('shortcuts.title')} header={header}>
        <div className="flex flex-col gap-8 pb-8">
          <p className="text-sm text-gray-400">{t('shortcuts.intro')}</p>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t('shortcuts.tokens')}</h2>
              <CreateShortcutToken />
            </div>
            <ShortcutTokenList />
          </section>

          <section className="flex flex-col gap-3">
            <ShortcutSetupGuide baseUrl={baseUrl} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('shortcuts.recent_expenses')}</h2>
            <ShortcutExpenseList />
          </section>
        </div>
      </MainLayout>
    </>
  );
};

ShortcutsPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    baseUrl: env.NEXTAUTH_URL.replace(/\/$/, ''),
    ...(await customServerSideTranslations(context.locale, ['common'])),
  },
});

export default ShortcutsPage;
