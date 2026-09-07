import React from 'react';
import type { Metadata } from 'next';
import { PsephoProvider } from '@/lib/collective/PsephoContext';
import { ProposalsPage } from '@/components/collective/ProposalsPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your proposals — psepho',
  description: 'Debates you have raised: those still taking votes, and the ones that have finished.',
};

export default function Proposals() {
  return (
    <PsephoProvider>
      <ProposalsPage />
    </PsephoProvider>
  );
}
