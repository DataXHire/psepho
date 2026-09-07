import React from 'react';
import { PsephoProvider } from '@/lib/collective/PsephoContext';
import { PsephoApp } from '@/components/collective/PsephoApp';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  return (
    <PsephoProvider>
      <PsephoApp />
    </PsephoProvider>
  );
}
