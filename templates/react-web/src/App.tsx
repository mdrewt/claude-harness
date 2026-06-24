import { useState } from 'react';
import { formatCents } from './format.js';

export default function App() {
  const [cents, setCents] = useState(1999);
  return (
    <main>
      <h1>{'{{NAME}}'}</h1>
      <output aria-label="amount">{formatCents(cents)}</output>
      <button type="button" onClick={() => setCents((c) => c + 100)}>
        +$1
      </button>
    </main>
  );
}
