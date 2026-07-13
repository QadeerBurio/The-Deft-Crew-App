// config/currentUser.js
// This should be dynamic based on the authenticated user

// Remove the hardcoded CURRENT_USER_ID
// Instead, use the AuthContext to get the current user

export const getCurrentUserId = (user) => {
  if (isGuest) {
    return 'guest-user';
  }
  return user?._id || user?.id || null;
};

export const isGuestMode = (isGuest) => {
  return isGuest === false;
};