'use client';

import React, { use } from 'react';
import ReceiptPage from '../[code]/page';

export default function VerifyPage(props: {
  searchParams: Promise<{ poll?: string }>;
}) {
  return (
    <ReceiptPage
      params={Promise.resolve({ code: '' })}
      searchParams={props.searchParams}
    />
  );
}
