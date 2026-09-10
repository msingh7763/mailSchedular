import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithPassword, registerWithPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
      await login(credentialResponse);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!email || !password || (isRegistering && !name)) {
      setError(isRegistering ? 'Enter your name, email, and password.' : 'Enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await registerWithPassword(name, email, password);
      } else {
        await loginWithPassword(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || (isRegistering ? 'Could not create your account.' : 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e8f7ef,_transparent_42%),linear-gradient(135deg,_#f8faf9_0%,_#eef4f1_100%)] px-4 py-8">
      <div className="w-full max-w-[430px] rounded-2xl border border-white/80 bg-white/95 px-6 py-8 text-center shadow-[0_20px_60px_rgba(31,72,52,0.12)] backdrop-blur sm:px-10">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f6ed] text-2xl text-[#008f45] shadow-sm">
          <span aria-hidden="true">✉</span>
        </div>
        <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.02em] text-[#183126]">{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-[#6b7c72]">{isRegistering ? 'Start sending thoughtful emails.' : 'Sign in to manage your email workspace.'}</p>

        {isLoading ? (
          <div className="mt-6 flex h-10 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-green-600 border-t-transparent" aria-label="Signing in" />
          </div>
        ) : (
          <div className="mt-6 flex h-10 justify-center overflow-hidden rounded-lg">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap={false}
              theme="filled_blue"
              size="medium"
              text="signin_with"
              shape="rectangular"
              width="226"
            />
          </div>
        )}

        <div className="my-5 flex items-center gap-3 text-sm tracking-wide text-[#9aa9a1]">
          <span className="h-px flex-1 bg-[#eeeeee]" />
          <span>{isRegistering ? 'or continue with Google' : 'or use email'}</span>
          <span className="h-px flex-1 bg-[#eeeeee]" />
        </div>

        <form className="space-y-3 text-left" onSubmit={handleEmailLogin}>
          {isRegistering && (
            <input
              aria-label="Name"
              className="h-12 w-full rounded-lg border border-[#dce7e0] bg-[#f7faf8] px-4 text-base text-[#252525] placeholder:text-[#87958d] focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
              placeholder="Name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
          <input
            aria-label="Email ID"
            className="h-12 w-full rounded-lg border border-[#dce7e0] bg-[#f7faf8] px-4 text-base text-[#252525] placeholder:text-[#87958d] focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
            placeholder="Email ID"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            aria-label="Password"
            className="h-12 w-full rounded-lg border border-[#dce7e0] bg-[#f7faf8] px-4 text-base text-[#252525] placeholder:text-[#87958d] focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="h-12 w-full rounded-lg bg-[#079447] text-base font-semibold text-white shadow-sm hover:bg-[#067b3b] hover:shadow-md" type="submit">
            {isRegistering ? 'Create account' : 'Login'}
          </button>
        </form>

        <button
          className="mt-5 text-sm font-medium text-[#137747] hover:text-[#075b33] hover:underline"
          type="button"
          onClick={() => {
            setIsRegistering((value) => !value);
            setError('');
          }}
        >
          {isRegistering ? 'Already have an account? Login' : 'Create an account'}
        </button>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-left text-sm leading-5 text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
