// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import React, { useState, useEffect, useRef } from 'react';
import { Download, Key, UserPlus, FileText, Shield, User, Sparkles, LogIn, Lock, CheckCircle, Copy, Upload, Globe, FileSignature, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { generateSecretKey, nip19 } from 'nostr-tools';
import { cn } from '@/lib/utils';

interface SignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const sanitizeFilename = (filename: string) => {
  return filename.replace(/[^a-z0-9_.-]/gi, '_');
}

const SignupDialog: React.FC<SignupDialogProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'generate' | 'download' | 'profile' | 'done'>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [showSparkles, setShowSparkles] = useState(false);
  const [keySecured, setKeySecured] = useState<'none' | 'copied' | 'downloaded'>('none');
  const [profileData, setProfileData] = useState({
    name: '',
    about: '',
    picture: ''
  });
  const login = useLoginActions();
  const { mutateAsync: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Generate a proper nsec key using nostr-tools
  const generateKey = () => {
    setIsLoading(true);
    setShowSparkles(true);

    // Add a dramatic pause for the key generation effect
    setTimeout(() => {
      try {
        // Generate a new secret key
        const sk = generateSecretKey();

        // Convert to nsec format
        setNsec(nip19.nsecEncode(sk));
        setStep('download');

        toast({
          title: 'Your Secret Key is Ready!',
          description: 'A new secret key has been generated for you.',
        });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to generate key. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setShowSparkles(false);
      }
    }, 2000);
  };

  const downloadKey = () => {
    try {
      // Create a blob with the key text
      const blob = new Blob([nsec], { type: 'text/plain; charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);

      // Sanitize filename
      const filename = sanitizeFilename('secret-key.txt');

      // Create a temporary link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Clean up immediately
      globalThis.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Mark as secured
      setKeySecured('downloaded');

      toast({
        title: 'Secret Key Saved!',
        description: 'Your key has been safely stored.',
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Could not download the key file. Please copy it manually.',
        variant: 'destructive',
      });
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(nsec);
    setKeySecured('copied');
    toast({
      title: 'Copied to clipboard!',
      description: 'Key copied to clipboard.',
    });
  };

  const finishKeySetup = () => {
    try {
      login.nsec(nsec);
      setStep('profile');
    } catch {
      toast({
        title: 'Login Failed',
        description: 'Failed to login with the generated key. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file for your avatar.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar image must be smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const tags = await uploadFile(file);
      // Get the URL from the first tag
      const url = tags[0]?.[1];
      if (url) {
        setProfileData(prev => ({ ...prev, picture: url }));
        toast({
          title: 'Avatar uploaded!',
          description: 'Your avatar has been uploaded successfully.',
        });
      }
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const finishSignup = async (skipProfile = false) => {
    // Mark signup completion time for fallback welcome modal
    localStorage.setItem('signup_completed', Date.now().toString());

    try {
      // Publish profile if user provided information
      if (!skipProfile && (profileData.name || profileData.about || profileData.picture)) {
        const metadata: Record<string, string> = {};
        if (profileData.name) metadata.name = profileData.name;
        if (profileData.about) metadata.about = profileData.about;
        if (profileData.picture) metadata.picture = profileData.picture;

        await publishEvent({
          kind: 0,
          content: JSON.stringify(metadata),
        });

        toast({
          title: 'Profile Created!',
          description: 'Your profile has been set up.',
        });
      }

      // Close signup and show welcome modal
      onClose();
      if (onComplete) {
        // Add a longer delay to ensure login state has fully propagated
        setTimeout(() => {
          onComplete();
        }, 600);
      } else {
        // Fallback for when used without onComplete
        setStep('done');
        setTimeout(() => {
          onClose();
          toast({
            title: 'Welcome!',
            description: 'Your account is ready.',
          });
        }, 3000);
      }
    } catch {
      toast({
        title: 'Profile Setup Failed',
        description: 'Your account was created but profile setup failed. You can update it later.',
        variant: 'destructive',
      });

      // Still proceed to completion even if profile failed
      onClose();
      if (onComplete) {
        // Add a longer delay to ensure login state has fully propagated
        setTimeout(() => {
          onComplete();
        }, 600);
      } else {
        // Fallback for when used without onComplete
        setStep('done');
        setTimeout(() => {
          onClose();
          toast({
            title: 'Welcome!',
            description: 'Your account is ready.',
          });
        }, 3000);
      }
    }
  };

  const getTitle = () => {
    if (step === 'welcome') return (
      <span className="flex items-center justify-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        Create Your Account
      </span>
    );
    if (step === 'generate') return (
      <span className="flex items-center justify-center gap-2">
        <Wand2 className="w-5 h-5 text-primary" />
        Generating Your Key
      </span>
    );
    if (step === 'download') return (
      <span className="flex items-center justify-center gap-2">
        <Lock className="w-5 h-5 text-primary" />
        Secret Key
      </span>
    );
    if (step === 'profile') return (
      <span className="flex items-center justify-center gap-2">
        <FileSignature className="w-5 h-5 text-primary" />
        Create Your Profile
      </span>
    );
    return (
      <span className="flex items-center justify-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Welcome!
      </span>
    );
  };

  const getDescription = () => {
    if (step === 'welcome') return 'Ready to join the Nostr network?';
    if (step === 'generate') return 'Creating your secret key to access Nostr.';

    if (step === 'profile') return 'Tell others about yourself.';
    return 'Your account is ready!';
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('welcome');
      setIsLoading(false);
      setNsec('');
      setShowSparkles(false);
      setKeySecured('none');
      setProfileData({ name: '', about: '', picture: '' });
    }
  }, [isOpen]);

  // Add sparkle animation effect
  useEffect(() => {
    if (showSparkles) {
      const interval = setInterval(() => {
        // This will trigger re-renders for sparkle animation
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showSparkles]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border-0 bg-transparent p-0 shadow-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
        {/* Outer Glass Container */}
        <div className="relative rounded-3xl border border-white/10 bg-black/30 backdrop-blur-2xl p-8">
          {/* Main dialog content */}
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-medium text-white">Create Your Account</h2>
          </div>

          {/* Main Content Card */}
          <div className="mx-auto max-w-sm rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl p-6">
            {/* Welcome Step */}
            {step === 'welcome' && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                  <span className="text-lg font-medium text-white">New to Nostr?</span>
                </div>
                
                <div className="space-y-3 text-white/70 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Decentralized and censorship-resistant</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4" />
                    <span>You control your data</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Join a global network</span>
                  </div>
                </div>

                <p className="text-sm text-white/70">
                  Join the Nostr network and take control of your social media experience.
                </p>

                <Button
                  onClick={() => setStep('generate')}
                  className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Get Started
                </Button>
              </div>
            )}

            {/* Generate Step */}
            {step === 'generate' && (
              <div className="text-center space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Key className="w-16 h-16 text-white mx-auto animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Generating your secret key...
                      </p>
                      <p className="text-sm text-white/70">
                        Creating your secure key
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Key className="w-16 h-16 text-white mx-auto" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-white">
                        Ready to generate your secret key?
                      </p>
                      <p className="text-sm text-white/70">
                        This key will be your password to access applications within the Nostr network.
                      </p>
                    </div>
                    <Button
                      onClick={generateKey}
                      disabled={isLoading}
                      className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate My Secret Key
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Download Step */}
            {step === 'download' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center items-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <Key className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-black" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-lg font-medium text-white">
                    Your secret key is ready!
                  </p>
                  <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <p className="text-xs text-yellow-200">
                      ⚠️ This key is your only way to access your account. Store it safely!
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={downloadKey}
                    className={cn(
                      "w-full rounded-full font-medium py-3 transition-all duration-200",
                      keySecured === 'downloaded'
                        ? "bg-green-500/20 text-green-200 border border-green-500/30"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    )}
                  >
                    {keySecured === 'downloaded' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download as File
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={copyKey}
                    className={cn(
                      "w-full rounded-full font-medium py-3 transition-all duration-200",
                      keySecured === 'copied'
                        ? "bg-green-500/20 text-green-200 border border-green-500/30"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    )}
                  >
                    {keySecured === 'copied' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={finishKeySetup}
                    disabled={keySecured === 'none'}
                    className={cn(
                      "w-full rounded-full font-medium py-3 transition-all duration-200",
                      keySecured !== 'none'
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/30 text-white/50 cursor-not-allowed"
                    )}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {keySecured === 'none' ? 'Please secure your key first' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Profile Step */}
            {step === 'profile' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="flex justify-center items-center mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-white">Set up your profile</p>
                  <p className="text-sm text-white/70">Tell others about yourself</p>
                </div>

                {isPublishing && (
                  <div className="flex items-center justify-center gap-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-200">Publishing your profile...</span>
                  </div>
                )}

                <div className={cn("space-y-4", isPublishing && "opacity-50 pointer-events-none")}>
                  <div className="space-y-2">
                    <label htmlFor="profile-name" className="text-sm font-medium text-white/80">
                      Display Name
                    </label>
                    <Input
                      id="profile-name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
                      disabled={isPublishing}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="profile-about" className="text-sm font-medium text-white/80">
                      Bio
                    </label>
                    <Textarea
                      id="profile-about"
                      value={profileData.about}
                      onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                      placeholder="Tell others about yourself..."
                      className="rounded-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 resize-none"
                      rows={3}
                      disabled={isPublishing}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="profile-picture" className="text-sm font-medium text-white/80">
                      Avatar URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="profile-picture"
                        value={profileData.picture}
                        onChange={(e) => setProfileData(prev => ({ ...prev, picture: e.target.value }))}
                        placeholder="https://example.com/avatar.jpg"
                        className="rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20 flex-1"
                        disabled={isPublishing}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={avatarFileInputRef}
                        onChange={handleAvatarUpload}
                      />
                      <Button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        disabled={isUploading || isPublishing}
                        className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 px-3"
                      >
                        {isUploading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => finishSignup(false)}
                    disabled={isPublishing || isUploading}
                    className="w-full rounded-full bg-white text-black hover:bg-white/90 font-medium py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Create Profile & Finish
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => finishSignup(true)}
                    disabled={isPublishing || isUploading}
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent font-medium py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupDialog;
