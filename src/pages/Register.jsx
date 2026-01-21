import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Auth, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register({ theme = 'light' }) {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // O tipo de acesso é definido pelo administrador; oculto no registro

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await Auth.register(email, password, nome);
      const me = await User.me();
      if (me) navigate(createPageUrl('Dashboard'));
      else navigate(createPageUrl('Empreendimentos'));
    } catch (err) {
      setError('Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <Card className={isDark ? 'bg-gray-800 border-gray-700' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>Criar conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className={isDark ? 'text-gray-300' : ''}>Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={isDark ? 'text-gray-300' : ''}>Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className={isDark ? 'text-gray-300' : ''}>Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''} />
            </div>
            {/* Tipo de acesso não é escolhível aqui; o administrador define posteriormente */}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => navigate(createPageUrl('Login'))}>Já tenho conta</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
