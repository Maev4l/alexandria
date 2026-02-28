// Edited by Claude.
// Account page - user profile and password change
import { useState } from 'react';
import { Copy, Check, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { AppBar } from '@/navigation';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

// Extract initials for avatar display
// Prefer displayName, fall back to username (email)
const getInitials = (displayName, username) => {
  const name = displayName || username;
  if (!name) return '?';

  if (displayName) {
    // For display name, use first letter of each word (max 2)
    const words = displayName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }

  // For email, use first 2 letters of local part
  const localPart = username.split('@')[0];
  return localPart.substring(0, 2).toUpperCase();
};

// Password complexity check item
const CheckItem = ({ checked, label }) => (
  <div className="flex items-center gap-2">
    {checked ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    )}
    <span className={`text-xs ${checked ? 'text-green-600' : 'text-muted-foreground'}`}>
      {label}
    </span>
  </div>
);

const Account = () => {
  const { user, changePassword } = useAuth();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Password change form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Password complexity validation
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = oldPassword && isPasswordValid && passwordsMatch && !isChangingPassword;

  // Copy email to clipboard
  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle password change submission
  const handleChangePassword = async (e) => {
    e.preventDefault();

    setIsChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppBar title="Account" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Avatar and email section */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
              {getInitials(user?.displayName, user?.email)}
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{user?.email || '—'}</span>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <p className="text-xs text-muted-foreground">
              Share your email with others so they can share their libraries with you.
            </p>
          </div>

          {/* Change password section */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Change Password
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password complexity checklist */}
                <div className="space-y-1 pt-1">
                  <CheckItem checked={passwordChecks.minLength} label="At least 8 characters" />
                  <CheckItem checked={passwordChecks.hasUppercase} label="At least 1 uppercase letter" />
                  <CheckItem checked={passwordChecks.hasLowercase} label="At least 1 lowercase letter" />
                  <CheckItem checked={passwordChecks.hasNumber} label="At least 1 number" />
                  <CheckItem checked={passwordChecks.hasSpecial} label="At least 1 special character" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full"
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
