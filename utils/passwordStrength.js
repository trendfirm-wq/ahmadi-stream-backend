export const checkPasswordStrength = (password) => {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: '#ef4444', progress: 0.3 };
  if (score === 3 || score === 4) return { label: 'Medium', color: '#f59e0b', progress: 0.6 };
  return { label: 'Strong', color: '#22c55e', progress: 1 };
};