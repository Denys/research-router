/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChatProvider } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { TopControls } from './components/TopControls';
import { ChatPanel } from './components/ChatPanel';
import { RightDrawer } from './components/RightDrawer';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  return (
    <ChatProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <TopControls />
          <div className="flex-1 flex relative overflow-hidden">
            <ChatPanel />
            <RightDrawer />
          </div>
        </div>
        <SettingsModal />
      </div>
    </ChatProvider>
  );
}
