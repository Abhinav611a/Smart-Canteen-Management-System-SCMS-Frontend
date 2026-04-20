export function getApiErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback

  return String(message || '').trim() || fallback
}

export default getApiErrorMessage
