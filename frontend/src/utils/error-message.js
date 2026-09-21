export function extractErrorMessage(err, fallback) {
  const message = err.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  return message ?? fallback;
}
