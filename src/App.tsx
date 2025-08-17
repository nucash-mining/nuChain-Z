import React from 'react';
import { Toaster } from 'react-hot-toast';
import MiningRigBuilder from './components/MiningRigBuilder';

function App() {
  return (
    <div className="min-h-screen">
      <MiningRigBuilder />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #475569'
          }
        }}
      />
    </div>
  );
}

export default App;
