import { useMemo, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EMPTY_FORM = {
  fullName: '',
  emailAddress: '',
  password: '',
  confirmPassword: '',
};

const getNameParts = (fullName) => {
  const name = String(fullName || '').trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = name.split(' ');

  return {
    name,
    firstName: firstName || '',
    lastName: rest.join(' ') || undefined,
  };
};

const getClerkErrorMessage = (error) => {
  const clerkMessage = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message;
  return clerkMessage || error?.message || 'Authentication failed. Please try again.';
};

const AuthPanel = () => {
  const [mode, setMode] = useState('sign-in');
  const [form, setForm] = useState(EMPTY_FORM);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();

  const isLoaded = isSignInLoaded && isSignUpLoaded;

  const submitButtonLabel = useMemo(() => {
    if (isSubmitting) {
      return 'Please wait...';
    }

    if (mode === 'sign-up') {
      return 'Create account';
    }

    return 'Sign in';
  }, [isSubmitting, mode]);

  const resetFormState = () => {
    setForm(EMPTY_FORM);
    setVerificationCode('');
    setPendingVerification(false);
    setIsSubmitting(false);
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetFormState();
  };

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const signInWithPassword = async () => {
    const attempt = await signIn.create({
      identifier: form.emailAddress.trim(),
      password: form.password,
    });

    if (attempt.status !== 'complete' || !attempt.createdSessionId) {
      throw new Error('Unable to complete sign in. Please try again.');
    }

    await setActive({ session: attempt.createdSessionId });
  };

  const signUpWithPassword = async () => {
    if (form.password !== form.confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const { name, firstName, lastName } = getNameParts(form.fullName);

    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters long.');
    }

    const attempt = await signUp.create({
      emailAddress: form.emailAddress.trim(),
      password: form.password,
      firstName,
      lastName,
      unsafeMetadata: {
        fullName: name,
      },
    });

    if (attempt.status === 'complete' && attempt.createdSessionId) {
      await setActive({ session: attempt.createdSessionId });
      return;
    }

    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    setPendingVerification(true);

    toast.info('Verification code sent to your email address.');
  };

  const onAuthSubmit = async (event) => {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'sign-up') {
        await signUpWithPassword();
      } else {
        await signInWithPassword();
      }
    } catch (error) {
      toast.error(getClerkErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyEmailCode = async (event) => {
    event.preventDefault();

    if (!verificationCode.trim()) {
      toast.error('Verification code is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (attempt.status !== 'complete' || !attempt.createdSessionId) {
        throw new Error('Unable to verify email right now. Please try again.');
      }

      await setActive({ session: attempt.createdSessionId });
    } catch (error) {
      toast.error(getClerkErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-dvh overflow-y-auto bg-green-50 bg-[radial-gradient(circle_at_20%_20%,#86efac_0,transparent_25%),radial-gradient(circle_at_80%_15%,#bbf7d0_0,transparent_30%),linear-gradient(to_bottom,#f0fdf4,#dcfce7)] px-3 py-4 sm:px-4 sm:py-8 flex items-start sm:items-center justify-center">
      <ToastContainer />
      <div className="w-full max-w-md rounded-3xl border border-green-200 bg-white/90 p-4 sm:p-6 shadow-xl backdrop-blur my-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
          <span className="text-green-500">&lt;</span>
          <span>Pass</span>
          <span className="text-green-500">OP/&gt;</span>
        </h1>
        <p className="text-center text-sm text-green-800 mt-1 mb-6">
          Secure access to your personal password vault
        </p>

        {pendingVerification ? (
          <form onSubmit={verifyEmailCode} className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-700">Email verification code</span>
              <input
                type="text"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="Enter the 6-digit code"
                className="mt-1 w-full rounded-2xl border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !isLoaded}
              className="w-full rounded-2xl bg-green-700 py-2 font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {isSubmitting ? 'Verifying...' : 'Verify email'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('sign-up')}
              className="w-full rounded-2xl border border-green-300 py-2 text-sm text-green-800 transition-colors hover:bg-green-50"
            >
              Back to sign up
            </button>
          </form>
        ) : (
          <form onSubmit={onAuthSubmit} className="space-y-4">
            {mode === 'sign-up' && (
              <label className="block">
                <span className="text-sm text-gray-700">Name</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={form.fullName}
                  onChange={onFieldChange}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-2xl border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm text-gray-700">Email</span>
              <input
                type="email"
                name="emailAddress"
                autoComplete="email"
                required
                value={form.emailAddress}
                onChange={onFieldChange}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>

            <div className="block">
              <span className="text-sm text-gray-700">Password</span>
              <div className="mt-1 relative">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  name="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={onFieldChange}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-green-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                >
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {mode === 'sign-up' && (
              <div className="block">
                <span className="text-sm text-gray-700">Confirm password</span>
                <div className="mt-1 relative">
                  <input
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={onFieldChange}
                    placeholder="Repeat your password"
                    className="w-full rounded-2xl border border-green-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                  >
                    {isConfirmPasswordVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isLoaded}
              className="w-full rounded-2xl bg-green-700 py-2 font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {submitButtonLabel}
            </button>

            <button
              type="button"
              onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              className="w-full rounded-2xl border border-green-300 py-2 text-sm text-green-800 transition-colors hover:bg-green-50"
            >
              {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPanel;
