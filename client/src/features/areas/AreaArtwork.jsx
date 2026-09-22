// Original geometric drawings, kept as small local vectors. Decorative; every card has a visible name.
const drawings = {
  generic: <><circle cx="125" cy="56" r="36" /><circle cx="195" cy="56" r="36" /><path d="M160 20v72M92 56h136" /></>,
  fitness: <><ellipse cx="170" cy="64" rx="90" ry="28" /><ellipse cx="170" cy="64" rx="62" ry="16" /><path d="m95 25 28 24m-36-17 17-18m11 38 17-18m102-9-29 24m37-17-17-18m-12 38-17-18" /></>,
  university: <><path d="M160 30c-32-20-69-19-100-11v64c35-9 68-7 100 10 32-17 65-19 100-10V19c-32-8-68-9-100 11Zm0 0v63M76 36c25-3 43 0 65 9M76 51c25-3 43 0 65 9m-65 6c25-3 43 0 65 9m41-30c22-9 41-12 65-9m-65 24c22-9 41-12 65-9" /></>,
  career: <><path d="M58 89h47V68h47V47h47V26h47V8M58 99h208M192 17l55-10-1 54" /><circle cx="90" cy="36" r="12" /><path d="M78 49v16m24-16v16" /></>,
  finance: <><path d="M61 92V67h28v25m20 0V45h28v47m20 0V28h28v64m20 0V12h28v80M51 96h202" /><circle cx="270" cy="31" r="19" /><path d="M260 32h20m-16-6h12m-12 12h12" /></>,
  home: <><path d="m62 51 51-40 51 40m-89-9v54h77V42m-47 54V63h24v33M229 96V48m0 17c-31 2-43-10-43-33 25 0 43 9 43 33Zm0-13c0-26 15-40 38-40-1 24-13 39-38 40Zm-23 26h47l-8 24h-31Z" /></>,
  style: <><path d="M144 28c-12-18 14-26 18-12 3 10-8 9-8 19l81 43H77l77-43m-28 55-9 16m-19-16-9 16m121-16 9 16m-37-16 9 16" /><circle cx="257" cy="30" r="11" /></>,
  food: <><path d="M85 62h150c-4 25-30 39-75 39S89 87 85 62Zm15-9h120M128 50c-8-14 8-15 0-31m28 31c-8-14 8-15 0-31m28 31c-8-14 8-15 0-31" /><circle cx="257" cy="58" r="18" /><path d="M257 39c-3-12 6-21 18-21 0 13-6 22-18 21Z" /></>,
  creative: <><path d="M48 74C82 0 132 9 133 47s-55 29-23 49 65-60 84-61 6 56 68 34" /><circle cx="238" cy="25" r="15" /><path d="m160 13 5 11 12 1-9 8 3 12-11-6-10 6 2-12-9-8 12-1Z" /></>,
  travel: <><path d="m39 93 65-76 62 76m-80-54 18 12 17-12m28 54 49-56 49 56M175 99c66-28 109 10 108-24" /><circle cx="256" cy="26" r="15" /></>,
  personal: <><ellipse cx="160" cy="55" rx="98" ry="33" transform="rotate(-15 160 55)" /><ellipse cx="160" cy="55" rx="45" ry="48" transform="rotate(32 160 55)" /><circle cx="160" cy="55" r="14" /><circle cx="248" cy="28" r="7" /><circle cx="87" cy="91" r="5" /></>,
}
export function AreaArtwork({ areaKey }) {
  return <svg viewBox="0 0 320 112" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {drawings[areaKey] || drawings.generic}
  </svg>
}
