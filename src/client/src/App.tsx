import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { ScannerPage } from './pages/ScannerPage';
import { DevicesPage } from './pages/DevicesPage';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-4 sm:py-8">
        <Header />

        <main className="space-y-4 md:space-y-6">
          <Routes>
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/" element={<ScannerPage />} />
          </Routes>
        </main>

        <footer className="mt-12 text-center text-sm text-zinc-500">
          btprox · Bluetooth proximity sensor
        </footer>
      </div>
    </div>
  );
}
