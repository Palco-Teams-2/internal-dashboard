import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ActiveNumbers from './pages/ActiveNumbers';
import GHLIntegration from './pages/GHLIntegration';
import BulkPurchase from './pages/BulkPurchase';
import Analytics from './pages/Analytics';
import SetterPerformance from './pages/Setterperformance';
import CloserManagement from './pages/CloserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bulk-purchase" element={<BulkPurchase />} />
          <Route path="numbers" element={<ActiveNumbers />} />
          <Route path="ghl" element={<GHLIntegration />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="setters" element={<SetterPerformance />} />
          <Route path="closers" element={<CloserManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;