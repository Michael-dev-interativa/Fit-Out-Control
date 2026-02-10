import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from "react"
import { apiUrl } from "@/api/config"

function App() {
  // Wake up backend se estiver dormindo (Render free tier)
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        await fetch(apiUrl('/api/health'), { method: 'GET' });
        console.log('✅ Backend acordado');
      } catch (error) {
        console.warn('⚠️ Erro ao acordar backend:', error);
      }
    };

    wakeUpBackend();

    // Ping periódico a cada 10 minutos para manter backend acordado
    const interval = setInterval(wakeUpBackend, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App 