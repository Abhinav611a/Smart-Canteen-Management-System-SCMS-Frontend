// ─── Field Validators ─────────────────────────────────────────────────────────

export const isRequired = (value) =>
  value !== undefined && value !== null && String(value).trim() !== ''

export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const isMinLength = (value, min) =>
  String(value).trim().length >= min

export const isMaxLength = (value, max) =>
  String(value).trim().length <= max

export const isPositiveNumber = (value) =>
  !isNaN(value) && Number(value) > 0

export const isEthAddress = (value) =>
  /^0x[a-fA-F0-9]{40}$/.test(value)

// ─── Form Validators ──────────────────────────────────────────────────────────

export const validateLogin = ({ email, password }) => {
  const errors = {}
  if (!isRequired(email))   errors.email    = 'Email is required'
  else if (!isEmail(email)) errors.email    = 'Enter a valid email address'
  if (!isRequired(password)) errors.password = 'Password is required'
  return errors
}

export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = {}
  if (!isRequired(name))                  errors.name            = 'Full name is required'
  else if (!isMinLength(name, 2))         errors.name            = 'Name must be at least 2 characters'
  if (!isRequired(email))                 errors.email           = 'Email is required'
  else if (!isEmail(email))               errors.email           = 'Enter a valid email address'
  if (!isRequired(password))              errors.password        = 'Password is required'
  else if (!isMinLength(password, 6))     errors.password        = 'Password must be at least 6 characters'
  if (password !== confirmPassword)       errors.confirmPassword = 'Passwords do not match'
  return errors
}

export const validateMenuItem = ({ name, price, category }) => {
  const errors = {}
  if (!isRequired(name))                  errors.name     = 'Item name is required'
  if (!isRequired(price))                 errors.price    = 'Price is required'
  else if (!isPositiveNumber(price))      errors.price    = 'Price must be a positive number'
  if (!isRequired(category))             errors.category = 'Category is required'
  return errors
}

// ─── Helper ───────────────────────────────────────────────────────────────────
export const hasErrors = (errors) => Object.keys(errors).length > 0
