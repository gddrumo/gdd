
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Lock, User as UserIcon, ArrowRight, LogIn, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [profileType, setProfileType] = useState<'GESTAO' | 'TIME'>('GESTAO');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await api.auth.login(profileType, password);

      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col animate-scale-in border border-gray-200">
        
        {/* Header */}
        <div className="bg-[#003A70] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">GDD</h1>
            <p className="text-blue-200 text-sm">Gestor de Demandas v2.0</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
             Acesso Restrito
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Profile Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    type="button"
                    onClick={() => { setProfileType('GESTAO'); setError(''); setPassword(''); }}
                    className={`py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                        profileType === 'GESTAO' 
                        ? 'bg-white text-[#003A70] shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <ShieldCheck size={16} /> Gestão
                </button>
                <button
                    type="button"
                    onClick={() => { setProfileType('TIME'); setError(''); setPassword(''); }}
                    className={`py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                        profileType === 'TIME' 
                        ? 'bg-white text-[#003A70] shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <UserIcon size={16} /> Time
                </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Senha de Acesso ({profileType === 'GESTAO' ? 'Executiva' : 'Técnica'})
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] transition-all outline-none text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-semibold text-center bg-red-50 p-3 rounded-lg border-2 border-red-300 flex items-center justify-center gap-2 animate-shake shadow-lg">
                <AlertTriangle size={18} className="text-red-500" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#003A70] hover:bg-blue-900 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-1">Permissões:</p>
            <p className="text-xs text-gray-500">
                {profileType === 'GESTAO' 
                    ? 'Visualização total + Inclusão de Demandas.' 
                    : 'Visualização total + Edição e Execução.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
