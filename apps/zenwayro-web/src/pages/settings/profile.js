export const MAX_PROFILE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png'];

export const PROFILE_IMAGE_ACCEPT = 'image/png,image/jpeg';

export const PROFILE_IMAGE_AVATAR_SIZE = 56;

export const CURRENT_USER_QUERY_KEY = ['users', 'me'];

export function settingsFieldId(label) {
  return String(label ?? '').toLowerCase().replace(/\s+/g, '-');
}

export function profileUpdateBody(values) {
  return {
    name: String(values?.name ?? '').trim(),
    username: String(values?.username ?? '').trim(),
  };
}

export function isImageValidationErrorMessage(message) {
  if (typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('png') ||
    normalized.includes('jpeg') ||
    normalized.includes('jpg') ||
    normalized.includes('image') ||
    normalized.includes('size') ||
    normalized.includes('too large') ||
    normalized.includes('file too large') ||
    normalized.includes('2mb')
  );
}

export function profileImageProblem(file) {
  if (!file) return null;
  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) return 'type';
  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) return 'size';
  return null;
}

export function profileImageProblemKeys(problem) {
  if (problem === 'type') {
    return {
      title: 'settings.imageTypeInvalid',
      description: 'settings.imageTypeInvalidDescription',
    };
  }
  if (problem === 'size') {
    return {
      title: 'settings.imageSizeExceeded',
      description: 'settings.imageSizeExceededDescription',
    };
  }
  return null;
}

export function imageUploadFailureCopy(message, isApiError) {
  if (isApiError && typeof message === 'string' && message) {
    return {
      title: message,
      descriptionKey: isImageValidationErrorMessage(message)
        ? 'settings.imageUploadFailedDescription'
        : undefined,
    };
  }
  return {
    titleKey: 'settings.imageUploadFailed',
    descriptionKey: 'settings.imageUploadFailedDescription',
  };
}
