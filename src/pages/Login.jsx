import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Auth, User } from '@/api/entities';
import { apiUrl } from '@/api/config.js';
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
  const [error, setError] = useState(null);
  const [logoMode, setLogoMode] = useState('logo'); // 'logo' | 'greeting'
  const [greetingName, setGreetingName] = useState('');

  const bgUrl = (import.meta.env?.VITE_LOGIN_BG) || '/bg-login.jpg';
  const logoUrl = (import.meta.env?.VITE_LOGIN_LOGO)
    || '/login-logo-horizontal.png';

  // Log automático da configuração de API
  React.useEffect(() => {
    (async () => {
      const apiBase = apiUrl('').replace(/\/$/, '');
      console.log('========== API CONFIG DEBUG ==========');
      console.log('API_BASE:', apiBase);
      console.log('VITE_API_URL:', import.meta.env.VITE_API_URL || '(NÃO CONFIGURADO)');
      console.log('window.location.origin:', window.location.origin);
      console.log('=====================================');
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const loginData = await Auth.login(email, password);
      const me = await User.me();
      console.log('========== LOGIN DEBUG ==========');
      console.log('loginData:', loginData);
      console.log('loginData.user:', loginData?.user);
      console.log('loginData.user.role:', loginData?.user?.role);
      console.log('me:', me);
      console.log('me.role:', me?.role);
      console.log('localStorage.appRole:', localStorage.getItem('appRole'));
      console.log('localStorage.perfilCliente:', localStorage.getItem('perfilCliente'));
      console.log('=================================');

      const nome = me?.full_name || me?.nome || loginData?.user?.nome || (email ? email.split('@')[0] : '');
      setGreetingName(nome);
      setLogoMode('greeting');

      // USAR APENAS DADOS DO BACKEND - NÃO verificar localStorage aqui
      // O localStorage já foi atualizado dentro do Auth.login(), mas vamos confiar apenas no backend
      const role = (me?.role || loginData?.user?.role || '').toLowerCase();
      const perfilClienteBackend = me?.perfil_cliente === true || loginData?.user?.perfil_cliente === true;
      const isCliente = (role === 'cliente') || perfilClienteBackend;

      console.log('Login.jsx -> ROLE FINAL (do backend):', role);
      console.log('Login.jsx -> PERFIL_CLIENTE (do backend):', perfilClienteBackend);
      console.log('Login.jsx -> IS_CLIENTE:', isCliente);
      console.log('Login.jsx -> REDIRECIONANDO PARA:', isCliente ? 'DashboardCliente' : 'Empreendimentos');
      setTimeout(() => {
        navigate(createPageUrl(isCliente ? 'DashboardCliente' : 'Empreendimentos'));
      }, 700);
    } catch (err) {
      setError(err?.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fundo estático preenchendo toda a tela */}
      <img src={bgUrl} alt="Fundo" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      {/* Gradiente leve para leitura — a imagem já tem gradiente embutido */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent" />

      {/* Título na lateral esquerda — visível apenas em telas grandes */}
      <div className="absolute inset-0 z-10 hidden lg:flex items-center pointer-events-none">
        <div className="pl-[5vw] xl:pl-[7vw] 2xl:pl-[10vw] w-1/2">
          <img
            src="/login-titulo.png"
            alt="Gerencie sua obra com precisão"
            className="w-full max-w-[480px] xl:max-w-[560px] 2xl:max-w-[640px] object-contain drop-shadow-2xl"
            style={{ animation: 'titleFadeIn 1s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '0.15s' }}
          />
        </div>
      </div>

      {/* Card de Login alinhado à direita */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-6 lg:px-12">
        <div className="w-full max-w-md lg:mr-[10vw] xl:mr-[12vw] 2xl:mr-[16vw]">
          <Card className="w-full bg-white/10 border-white/20 backdrop-blur-md shadow-2xl rounded-2xl">
            <CardHeader>
              {/* animações do logo e transição para saudação */}
              <style>{`@keyframes titleFadeIn{0%{opacity:0;transform:translateX(-32px)}100%{opacity:1;transform:translateX(0)}}@keyframes floaty{0%{transform:translateY(0)}50%{transform:translateY(-4px)}100%{transform:translateY(0)}}@keyframes breathing{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}@keyframes glow{0%{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))}50%{filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45))}100%{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))} @keyframes logoToTextOut{0%{opacity:1;transform:scale(1) translateY(0);filter:blur(0px)}60%{opacity:.4;transform:scale(.8) translateY(-4px);filter:blur(2px)}100%{opacity:0;transform:scale(.6) translateY(-6px);filter:blur(3px)}} @keyframes greetFromLogo{0%{opacity:0;transform:scale(.96) translateY(6px);letter-spacing:-0.02em}100%{opacity:1;transform:scale(1) translateY(0);letter-spacing:0}}`}</style>
              <div className="flex items-center justify-center -mt-10 mb-2">
                <div className="relative w-full h-16 md:h-20">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className={`h-10 md:h-12 w-auto max-w-full mx-auto transition-all duration-700 ease-out ${logoMode === 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
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
                    <div className="absolute inset-y-0 left-3 flex items-center text-white">
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
                    <div className="absolute inset-y-0 left-3 flex items-center text-white">
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
                  className="w-full bg-[#CF2B2C] hover:bg-[#b62627] text-white"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
