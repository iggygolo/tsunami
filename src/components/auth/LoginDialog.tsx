// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import React, { useRef, useState, useEffect } from 'react';
import { Shield, Upload, KeyRound, Sparkles, Cloud, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { useLoginActions } from '@/hooks/useLoginActions';
import { cn } from '@/lib/utils';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup?: () => void;
}

const validateNsec = (nsec: string) => {
  return /^nsec1[a-zA-Z0-9]{58}$/.test(nsec);
};

const validateBunkerUri = (uri: string) => {
  return uri.startsWith('bunker://');
};

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLogin, onSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [bunkerUri, setBunkerUri] = useState('');
  const [activeTab, setActiveTab] = useState<'extension' | 'key' | 'bunker'>('extension');
  const [errors, setErrors] = useState<{
    nsec?: string;
    bunker?: string;
    file?: string;
    extension?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const login = useLoginActions();

  // Reset all state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setIsFileLoading(false);
      setNsec('');
      setBunkerUri('');
      setErrors({});
      setActiveTab('nostr' in window ? 'extension' : 'key');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setErrors(prev => ({ ...prev, extension: undefined }));

    try {
      if (!('nostr' in window)) {
        throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
      }
      await login.extension();
      onLogin();
      onClose();
    } catch (e: unknown) {
      const error = e as Error;
      setErrors(prev => ({
        ...prev,
        extension: error instanceof Error ? error.message : 'Extension login failed'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const executeLogin = (key: string) => {
    setIsLoading(true);
    setErrors({});

    setTimeout(() => {
      try {
        login.nsec(key);
        onLogin();
        onClose();
      } catch {
        setErrors({ nsec: "Failed to login with this key. Please check that it's correct." });
        setIsLoading(false);
      }
    }, 50);
  };

  const handleKeyLogin = () => {
    if (!nsec.trim()) {
      setErrors(prev => ({ ...prev, nsec: 'Please enter your secret key' }));
      return;
    }

    if (!validateNsec(nsec)) {
      setErrors(prev => ({ ...prev, nsec: 'Invalid secret key format. Must be a valid nsec starting with nsec1.' }));
      return;
    }
    executeLogin(nsec);
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) {
      setErrors(prev => ({ ...prev, bunker: 'Please enter a bunker URI' }));
      return;
    }

    if (!validateBunkerUri(bunkerUri)) {
      setErrors(prev => ({ ...prev, bunker: 'Invalid bunker URI format. Must start with bunker://' }));
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, bunker: undefined }));

    try {
      await login.bunker(bunkerUri);
      onLogin();
      onClose();
      setBunkerUri('');
    } catch {
      setErrors(prev => ({
        ...prev,
        bunker: 'Failed to connect to bunker. Please check the URI.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setErrors({});

    const reader = new FileReader();
    reader.onload = (event) => {
      setIsFileLoading(false);
      const content = event.target?.result as string;
      if (content) {
        const trimmedContent = content.trim();
        if (validateNsec(trimmedContent)) {
          executeLogin(trimmedContent);
        } else {
          setErrors({ file: 'File does not contain a valid secret key.' });
        }
      } else {
        setErrors({ file: 'Could not read file content.' });
      }
    };
    reader.onerror = () => {
      setIsFileLoading(false);
      setErrors({ file: 'Failed to read file.' });
    };
    reader.readAsText(file);
  };

  const handleSignupClick = () => {
    onClose();
    if (onSignup) {
      onSignup();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border-0 bg-transparent p-0 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
        {/* Outer Glass Container */}
        <div className="relative rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-8">
          {/* Main dialog content */}
          <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-medium text-white">Sign Up or Log In</h2>
          </div>

          {/* Sign Up Card */}
          <div className="mx-auto max-w-sm rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-white" />
                <span className="text-lg font-medium text-white">New to Nostr?</span>
              </div>
              <p className="text-sm text-white/70">
                Create a new account to get started. It is free and open.
              </p>
              <Button
                onClick={handleSignupClick}
                className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
              >
                <User className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="text-center">
            <span className="text-white/50 text-sm">Or Log In</span>
          </div>

          {/* Login Method Tabs */}
          <div className="flex justify-center">
            <div className="flex rounded-full bg-black/40 backdrop-blur-xl border border-white/20 p-1">
              <button
                onClick={() => setActiveTab('extension')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'extension'
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white/80"
                )}
              >
                <Shield className="w-4 h-4" />
                Extension
              </button>
              <button
                onClick={() => setActiveTab('key')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'key'
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white/80"
                )}
              >
                <KeyRound className="w-4 h-4" />
                Key
              </button>
              <button
                onClick={() => setActiveTab('bunker')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeTab === 'bunker'
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white/80"
                )}
              >
                <Cloud className="w-4 h-4" />
                Bunker
              </button>
            </div>
          </div>

          {/* Login Content */}
          <div className="mx-auto max-w-sm rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-6">
            {activeTab === 'extension' && (
              <div className="text-center space-y-4">
                <Shield className="w-12 h-12 mx-auto text-white" />
                <p className="text-sm text-white/70">
                  Login with one click using the browser extension
                </p>
                {errors.extension && (
                  <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    {errors.extension}
                  </div>
                )}
                <Button
                  onClick={handleExtensionLogin}
                  disabled={isLoading}
                  className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
                >
                  {isLoading ? 'Logging in...' : 'Login with Extension'}
                </Button>
              </div>
            )}

            {activeTab === 'key' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="nsec" className="text-sm font-medium text-white/80">
                    Secret Key (nsec)
                  </label>
                  <Input
                    id="nsec"
                    type="password"
                    value={nsec}
                    onChange={(e) => {
                      setNsec(e.target.value);
                      if (errors.nsec) setErrors(prev => ({ ...prev, nsec: undefined }));
                    }}
                    className="rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
                    placeholder="nsec1..."
                    autoComplete="off"
                  />
                  {errors.nsec && (
                    <p className="text-red-400 text-sm">{errors.nsec}</p>
                  )}
                </div>
                <Button
                  onClick={handleKeyLogin}
                  disabled={isLoading || !nsec.trim()}
                  className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
                >
                  {isLoading ? 'Verifying...' : 'Log In'}
                </Button>
                <div className="text-center">
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isFileLoading}
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isFileLoading ? 'Reading File...' : 'Upload Key File'}
                  </Button>
                  {errors.file && (
                    <p className="text-red-400 text-sm mt-2">{errors.file}</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'bunker' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="bunkerUri" className="text-sm font-medium text-white/80">
                    Bunker URI
                  </label>
                  <Input
                    id="bunkerUri"
                    value={bunkerUri}
                    onChange={(e) => {
                      setBunkerUri(e.target.value);
                      if (errors.bunker) setErrors(prev => ({ ...prev, bunker: undefined }));
                    }}
                    className="rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
                    placeholder="bunker://"
                    autoComplete="off"
                  />
                  {errors.bunker && (
                    <p className="text-red-400 text-sm">{errors.bunker}</p>
                  )}
                </div>
                <Button
                  onClick={handleBunkerLogin}
                  disabled={isLoading || !bunkerUri.trim()}
                  className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
                >
                  {isLoading ? 'Connecting...' : 'Login with Bunker'}
                </Button>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
