/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { YearMonthFilterProvider } from '@/contexts/YearMonthFilterContext';
import { ModelProvider } from '@/contexts/ModelContext';

createRoot(document.getElementById('root')!).render(
  <YearMonthFilterProvider>
    <ModelProvider>
      <App />
    </ModelProvider>
  </YearMonthFilterProvider>
);
