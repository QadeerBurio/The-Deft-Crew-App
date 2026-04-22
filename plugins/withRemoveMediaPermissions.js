const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Simple plugin to remove media permissions from Android manifest
 */
module.exports = function withRemoveMediaPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Permissions to completely remove
    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_MEDIA_LOCATION'
    ];
    
    // Filter out the permissions from uses-permission
    if (androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission']
        .filter(permission => {
          const permName = permission.$['android:name'];
          return !permissionsToRemove.includes(permName);
        });
    }
    
    return config;
  });
};