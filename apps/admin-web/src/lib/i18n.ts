export const ko = {
  appTitle: '\uAE30\uC5C5 \uC694\uC57D',
  appSubtitle: 'OpenDART \uAE30\uBC18 \uC694\uC57D \uD2B8\uB80C\uB4DC',
  searchLabel: '\uD68C\uC0AC \uAC80\uC0C9',
  searchPlaceholder: '\uD68C\uC0AC\uBA85 \uB610\uB294 \uC885\uBAA9\uCF54\uB4DC\uB97C \uC785\uB825\uD558\uC138\uC694',
  searchEmpty: '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  searchSyncRequired:
    '\uD68C\uC0AC \uB514\uB809\uD130\uB9AC\uAC00 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC544 \uAC80\uC0C9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uB3D9\uAE30\uD654\uD558\uC138\uC694.',
  syncButton: '\uD68C\uC0AC \uB514\uB809\uD130\uB9AC \uB3D9\uAE30\uD654',
  syncing: '\uB3D9\uAE30\uD654 \uC911...',
  syncedCountPrefix: '\uB3D9\uAE30\uD654\uB41C \uD68C\uC0AC \uC218',
  summaryHeading: '\uC694\uC57D \uD2B8\uB80C\uB4DC',
  basisLabel: '\uC7AC\uBB34 \uAE30\uC900',
  marketCapNotice:
    '\uC2DC\uAC00\uCD1D\uC561(\uC6B0)\uC740 OpenDART v1\uC5D0\uC11C \uC81C\uACF5\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  controls: {
    period: '\uAE30\uC900',
    range: '\uAE30\uAC04',
    yearly: '\uC5F0\uB3C4',
    quarterly: '\uBD84\uAE30',
    ttm: '\uCD5C\uADFC 4\uAC1C \uBD84\uAE30',
    years5: '5\uB144',
    years10: '10\uB144'
  },
  metrics: {
    revenue: '\uB9E4\uCD9C\uC561',
    operatingIncome: '\uC601\uC5C5\uC774\uC775',
    sga: '\uD310\uB9E4\uAD00\uB9AC\uBE44',
    costOfSales: '\uB9E4\uCD9C\uC6D0\uAC00'
  },
  loading: '\uBD88\uB7EC\uC624\uB294 \uC911...',
  fetchError: '\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
} as const

export type Messages = typeof ko

export function t(): Messages {
  return ko
}
