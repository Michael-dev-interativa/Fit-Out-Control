import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Auth, User, Empreendimento } from '@/api/entities';
import { API_BASE } from '@/api/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login({ theme = 'light' }) {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState(null);
  const [logoMode, setLogoMode] = useState('logo'); // 'logo' | 'greeting'
  const [greetingName, setGreetingName] = useState('');

  const bgUrl = (import.meta.env?.VITE_LOGIN_BG) || '/bg-login.gif';
  const logoUrl = (import.meta.env?.VITE_LOGIN_LOGO)
    || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";

  // Empreendimentos para portfólio
  const [portfolio, setPortfolio] = useState([]);
  const [slide, setSlide] = useState(0);
  const slideIntervalMs = 4500;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await Empreendimento.list('created_at desc');
        const items = (list || []).map((e) => ({
          id: e.id,
          title: e.nome_empreendimento || e.nome || 'Empreendimento',
          city: e.cidade || e.localidade || '',
          image: e.foto_empreendimento || e.capa || e.banner || null,
        })).filter(Boolean);
        if (!cancelled && items.length) setPortfolio(items);
      } catch {
        if (!cancelled) {
          setPortfolio([
            { id: 'p1', title: 'Obra Comercial', city: 'São Paulo - SP', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1400&q=70&auto=format&fit=crop' },
            { id: 'p2', title: 'Residencial Premium', city: 'Curitiba - PR', image: 'https://images.unsplash.com/photo-1487956382158-bb926046304a?w=1400&q=70&auto=format&fit=crop' },
            { id: 'p3', title: 'Centro Corporativo', city: 'Rio de Janeiro - RJ', image: 'https://images.unsplash.com/photo-1460574283810-2aab119d8511?w=1400&q=70&auto=format&fit=crop' },
          ]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (portfolio.length <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % portfolio.length), slideIntervalMs);
    return () => clearInterval(t);
  }, [portfolio.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const loginData = await Auth.login(email, password);
      const me = await User.me();
      console.log('Login.jsx -> loginData.user:', loginData?.user);
      console.log('Login.jsx -> me:', me);
      const nome = me?.full_name || me?.nome || loginData?.user?.nome || (email ? email.split('@')[0] : '');
      setGreetingName(nome);
      setLogoMode('greeting');
      const role = ((loginData?.user?.role) || (me?.role) || (localStorage.getItem('appRole') || '')).toLowerCase();
      const isCliente = (role === 'cliente') || (loginData?.user?.perfil_cliente === true) || (me?.perfil_cliente === true) || (localStorage.getItem('perfilCliente') === 'true');
      console.log('Login.jsx -> role:', role, 'isCliente:', isCliente);
      setTimeout(() => {
        navigate(createPageUrl(isCliente ? 'DashboardCliente' : 'Dashboard'));
      }, 700);
    } catch (err) {
      setError('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fundo com imagem do portfólio preenchendo a página */}
      {/* Fallback base */}
      <img src={bgUrl} alt="Fundo" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      {/* Slides sobrepostos para crossfade */}
      {portfolio.map((item, idx) => (
        <div key={item.id} className={`absolute inset-0 transition-opacity duration-700 ${idx === slide ? 'opacity-100' : 'opacity-0'}`}>
          {item.image && (
            <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
      ))}
      {/* Gradiente para leitura (mais escuro à direita, clareando à esquerda) */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/50 to-black/20" />

      {/* Legenda do slide no canto inferior esquerdo */}
      {portfolio[slide] && (
        <div className="absolute bottom-10 left-10 z-[5] hidden lg:block">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div>
              <div className="text-white text-lg font-semibold tracking-wide">{portfolio[slide].title}</div>
              {portfolio[slide].city && <div className="text-white/80 text-sm">{portfolio[slide].city}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Indicadores inferior direito (evitar colisão com legenda) */}
      {portfolio.length > 1 && (
        <div className="absolute bottom-6 right-6 z-[5] hidden lg:flex gap-2">
          {portfolio.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-3 bg-white/50'}`} />
          ))}
        </div>
      )}

      {/* Card de Login alinhado à direita (posição pedida) */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-6 lg:px-12">
        <div className="w-full max-w-md lg:mr-[10vw] xl:mr-[12vw] 2xl:mr-[16vw]">
          <Card className="w-full bg-white/10 border-white/20 backdrop-blur-md shadow-2xl rounded-2xl">
            <CardHeader>
              {/* animações do logo e transição para saudação */}
              <style>{`@keyframes floaty{0%{transform:translateY(0)}50%{transform:translateY(-4px)}100%{transform:translateY(0)}}@keyframes breathing{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}@keyframes glow{0%{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))}50%{filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45))}100%{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))} @keyframes logoToTextOut{0%{opacity:1;transform:scale(1) translateY(0);filter:blur(0px)}60%{opacity:.4;transform:scale(.8) translateY(-4px);filter:blur(2px)}100%{opacity:0;transform:scale(.6) translateY(-6px);filter:blur(3px)}} @keyframes greetFromLogo{0%{opacity:0;transform:scale(.96) translateY(6px);letter-spacing:-0.02em}100%{opacity:1;transform:scale(1) translateY(0);letter-spacing:0}}`}</style>
              <div className="flex items-center justify-center -mt-10 mb-2">
                <div className="relative w-full h-20 md:h-24">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className={`h-20 md:h-24 w-auto mx-auto transition-all duration-700 ease-out ${logoMode === 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
                    style={{ objectFit: 'contain', animation: logoMode === 'logo' ? 'floaty 6s ease-in-out infinite, breathing 7s ease-in-out infinite, glow 6s ease-in-out infinite' : 'logoToTextOut 700ms ease-out forwards' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-out ${logoMode === 'greeting' ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: logoMode === 'greeting' ? 'greetFromLogo 700ms ease-out forwards' : 'none' }}>
                    <span className="text-white text-xl md:text-2xl font-semibold drop-shadow-lg whitespace-nowrap">Olá, {greetingName}</span>
                  </div>
                </div>
              </div>
              <CardTitle className="text-center text-white"></CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">Email</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-white/70">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-9.3 5.81a3 3 0 01-3.4 0L1.5 8.67z" />
                        <path d="M22.5 6.75v-.08a3 3 0 00-3-2.92h-15a3 3 0 00-3 2.92v.08l9.75 6.09a1.5 1.5 0 001.65 0L22.5 6.75z" />
                      </svg>
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/70 focus-visible:ring-white/40"
                      placeholder="voce@empresa.com"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200">Senha</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-white/70">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M12 1.5A5.25 5.25 0 006.75 6.75v2.25h10.5V6.75A5.25 5.25 0 0012 1.5zm-3.75 6V6.75a3.75 3.75 0 117.5 0V7.5h-7.5z" clipRule="evenodd" />
                        <path d="M3.75 9.75A2.25 2.25 0 016 7.5h12a2.25 2.25 0 012.25 2.25v8.25A3 3 0 0117.25 21H6.75A3 3 0 013.75 18V9.75z" />
                      </svg>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/70 focus-visible:ring-white/40"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                {error && <p className="text-red-300 text-sm">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-90 text-white"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                {/* Debug info - toggle com Ctrl+D */}
                <div className="text-xs text-white/60 text-center">
                  <button
                    type="button"
                    onClick={() => setShowDebug(!showDebug)}
                    className="hover:text-white/90 transition-colors"
                  >
                    {showDebug ? '🔍 Ocultar Debug' : '🔍 Mostrar Debug'}
                  </button>
                  {showDebug && (
                    <div className="mt-2 p-2 bg-black/40 rounded text-left space-y-1">
                      <div><strong>API_BASE:</strong> {API_BASE}</div>
                      <div><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || '(não configurado)'}</div>
                      <div><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</div>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
