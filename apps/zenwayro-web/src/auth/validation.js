export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MIN_NAME_LENGTH = 2;

export function validateEmail(email, t) {
  if (!email.trim()) return t('auth.emailRequired');
  if (!EMAIL_RE.test(email)) return t('auth.emailInvalid');
}

export function validatePassword(password, t) {
  if (!password) return t('auth.passwordRequired');
  if (password.length < MIN_PASSWORD_LENGTH) return t('auth.passwordTooShort');
}

export function validateName(name, t) {
  if (!name.trim()) return t('auth.nameRequired');
  if (name.trim().length < MIN_NAME_LENGTH) return t('auth.nameTooShort');
}

export function validateConfirmPassword(password, confirmPassword, t) {
  if (!confirmPassword) return t('auth.confirmPasswordRequired');
  if (password !== confirmPassword) return t('auth.passwordsDoNotMatch');
}
