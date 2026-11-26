/**
 * Placement-Setu Universal Form Validation Utilities
 * Follows Gujarat Vidyapith portal security specifications (NIST guidelines)
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,128}$/;

export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }
  const trimmed = email.trim();
  if (trimmed.length < 3) {
    return 'Email must be at least 3 characters long';
  }
  if (trimmed.length > 120) {
    return 'Email cannot exceed 120 characters';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email format (e.g. user@gujaratvidyapith.org)';
  }
  return null;
}

export function validatePassword(password, isLogin = false, email = '') {
  if (!password || !password.trim()) {
    return 'Password is required';
  }
  if (isLogin) {
    return null; // Never validate password rules or min/max lengths on login
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters';
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return 'Must include at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol';
  }

  if (email && email.trim()) {
    const emailNorm = email.trim().toLowerCase();
    const passNorm = password.toLowerCase();
    const localPart = emailNorm.includes('@') ? emailNorm.split('@')[0] : emailNorm;
    if (passNorm.includes(emailNorm) || (localPart.length >= 3 && passNorm.includes(localPart))) {
      return 'Password must not contain the email address';
    }
  }

  return null;
}

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '#E0E0E0' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score++;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: '#D32F2F' };
    case 2:
      return { score: 2, label: 'Fair', color: '#F57C00' };
    case 3:
      return { score: 3, label: 'Good', color: '#FBC02D' };
    case 4:
      return { score: 4, label: 'Strong', color: '#388E3C' };
    default:
      return { score: 0, label: '', color: '#E0E0E0' };
  }
}

export function validatePhone(phone) {
  if (!phone || !phone.trim()) {
    return 'Mobile number is required';
  }
  if (!/^[0-9]{10}$/.test(phone.trim())) {
    return 'Mobile number must be exactly 10 digits';
  }
  return null;
}

export function validateFullName(name) {
  if (!name || !name.trim()) {
    return 'Full name is required';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters';
  }
  if (trimmed.length > 50) {
    return 'Full name cannot exceed 50 characters';
  }
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return 'Full name can only contain alphabets and spaces';
  }
  return null;
}
