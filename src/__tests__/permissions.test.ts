import appConfig from '../../app.json';

describe('Mobile Permissions Configuration', () => {
  describe('iOS Permissions (Info.plist)', () => {
    const iosConfig = appConfig.expo.ios;
    const infoPlist = iosConfig?.infoPlist;

    it('should have all required iOS permissions configured', () => {
      expect(infoPlist).toBeDefined();
      
      // Essential permissions for TestFlight
      const requiredPermissions = [
        'NSContactsUsageDescription',
        'NSLocationWhenInUseUsageDescription',
        'NSLocationAlwaysAndWhenInUseUsageDescription',
        'NSCameraUsageDescription',
        'NSPhotoLibraryUsageDescription',
        'NSCalendarsUsageDescription',
        'NSMicrophoneUsageDescription',
      ];

      requiredPermissions.forEach(permission => {
        expect(infoPlist[permission]).toBeDefined();
        expect(infoPlist[permission]).not.toBe('');
        expect(typeof infoPlist[permission]).toBe('string');
      });
    });

    it('should have descriptive permission descriptions', () => {
      const descriptions = [
        infoPlist?.NSContactsUsageDescription,
        infoPlist?.NSLocationWhenInUseUsageDescription,
        infoPlist?.NSLocationAlwaysAndWhenInUseUsageDescription,
        infoPlist?.NSCameraUsageDescription,
        infoPlist?.NSPhotoLibraryUsageDescription,
        infoPlist?.NSCalendarsUsageDescription,
        infoPlist?.NSMicrophoneUsageDescription,
      ];

      descriptions.forEach(description => {
        expect(description).toBeDefined();
        expect(description!.length).toBeGreaterThan(20); // Meaningful description
        expect(description).toContain('& friends'); // App name mentioned
      });
    });

    it('should have proper bundle identifier and build configuration', () => {
      expect(iosConfig?.bundleIdentifier).toBe('com.asteerix.andfriends');
      expect(iosConfig?.buildNumber).toBeDefined();
      expect(iosConfig?.supportsTablet).toBe(true);
    });

    it('should have associated domains configured', () => {
      const domains = iosConfig?.associatedDomains;
      expect(domains).toBeDefined();
      expect(Array.isArray(domains)).toBe(true);
      expect(domains).toContain('applinks:andfriends.app');
      expect(domains).toContain('applinks:*.andfriends.app');
    });
  });

  describe('Android Permissions', () => {
    const androidConfig = appConfig.expo.android;
    const permissions = androidConfig?.permissions;

    it('should have all required Android permissions', () => {
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);

      const requiredPermissions = [
        'android.permission.READ_CONTACTS',
        'android.permission.ACCESS_FINE_LOCATION', 
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
        'android.permission.RECORD_AUDIO',
      ];

      requiredPermissions.forEach(permission => {
        expect(permissions).toContain(permission);
      });
    });

    it('should have proper package configuration', () => {
      expect(androidConfig?.package).toBe('com.amaury_polta.and_friends');
      expect(androidConfig?.adaptiveIcon).toBeDefined();
      expect(androidConfig?.adaptiveIcon?.foregroundImage).toBe('./assets/adaptive-icon.png');
      expect(androidConfig?.adaptiveIcon?.backgroundColor).toBe('#FF6B6B');
    });

    it('should have intent filters for deep linking', () => {
      const intentFilters = androidConfig?.intentFilters;
      expect(intentFilters).toBeDefined();
      expect(Array.isArray(intentFilters)).toBe(true);
      expect(intentFilters!.length).toBeGreaterThan(0);

      const mainFilter = intentFilters![0];
      expect(mainFilter.action).toBe('VIEW');
      expect(mainFilter.autoVerify).toBe(true);
      expect(mainFilter.data).toBeDefined();
      expect(Array.isArray(mainFilter.data)).toBe(true);
    });
  });

  describe('Expo Plugins Configuration', () => {
    const plugins = appConfig.expo.plugins;

    it('should have all required plugins', () => {
      expect(plugins).toBeDefined();
      expect(Array.isArray(plugins)).toBe(true);

      const requiredPlugins = [
        'expo-localization',
        'expo-web-browser',
        'expo-contacts',
        'expo-location',
        'expo-image-picker',
        'expo-calendar',
        'expo-av',
        'expo-font',
      ];

      const pluginNames = plugins.map((plugin: any) => 
        typeof plugin === 'string' ? plugin : plugin[0]
      );

      requiredPlugins.forEach(plugin => {
        expect(pluginNames).toContain(plugin);
      });
    });

    it('should have location plugin properly configured', () => {
      const locationPlugin = plugins.find((plugin: any) => 
        Array.isArray(plugin) && plugin[0] === 'expo-location'
      );

      expect(locationPlugin).toBeDefined();
      expect(locationPlugin[1]).toBeDefined();
      expect(locationPlugin[1].locationAlwaysAndWhenInUsePermission).toBeDefined();
      expect(locationPlugin[1].locationAlwaysAndWhenInUsePermission).toContain('& friends');
    });
  });

  describe('App Configuration', () => {
    it('should have proper app metadata', () => {
      const expo = appConfig.expo;
      
      expect(expo.name).toBe('& friends');
      expect(expo.slug).toBe('andfriends');
      expect(expo.version).toBeDefined();
      expect(expo.orientation).toBe('portrait');
      expect(expo.scheme).toBe('andfriends');
    });

    it('should have splash screen configured', () => {
      const splash = appConfig.expo.splash;
      
      expect(splash).toBeDefined();
      expect(splash.image).toBe('./assets/splash-icon.png');
      expect(splash.resizeMode).toBe('contain');
      expect(splash.backgroundColor).toBe('#FF6B6B');
    });

    it('should have EAS project configured', () => {
      const extra = appConfig.expo.extra;
      
      expect(extra).toBeDefined();
      expect(extra.eas).toBeDefined();
      expect(extra.eas.projectId).toBeDefined();
      expect(extra.eas.projectId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });
  });

  describe('Privacy and Security', () => {
    it('should not expose sensitive configuration', () => {
      const extra = appConfig.expo.extra;
      
      // Supabase keys should be placeholders in config
      expect(extra.supabaseUrl).toContain('REMPLACER_PAR_VOTRE_URL');
      expect(extra.supabaseAnonKey).toContain('REMPLACER_PAR_VOTRE_CLE');
      
      // Test email should be placeholder
      expect(extra.testEmail).toBe('test@example.com');
    });

    it('should have proper permission justifications', () => {
      const iosDescriptions = appConfig.expo.ios?.infoPlist;
      
      // Check that permissions explain WHY they're needed
      expect(iosDescriptions?.NSContactsUsageDescription).toMatch(/find.*connect.*friends/i);
      expect(iosDescriptions?.NSLocationWhenInUseUsageDescription).toMatch(/events.*nearby/i);
      expect(iosDescriptions?.NSCameraUsageDescription).toMatch(/photos.*profile/i);
      expect(iosDescriptions?.NSCalendarsUsageDescription).toMatch(/add events/i);
      expect(iosDescriptions?.NSMicrophoneUsageDescription).toMatch(/audio messages/i);
    });
  });

  describe('TestFlight Readiness', () => {
    it('should meet Apple App Store guidelines', () => {
      const ios = appConfig.expo.ios;
      
      // Bundle identifier should follow reverse domain naming
      expect(ios?.bundleIdentifier).toMatch(/^[a-z0-9-.]+$/);
      expect(ios?.bundleIdentifier?.split('.').length).toBeGreaterThanOrEqual(3);
      
      // Build number should be defined for TestFlight
      expect(ios?.buildNumber).toBeDefined();
      expect(ios?.buildNumber).toMatch(/^\d+$/);
    });

    it('should support all required iOS features', () => {
      const ios = appConfig.expo.ios;
      
      // Should support iPad for better user experience
      expect(ios?.supportsTablet).toBe(true);
      
      // Should have app icon configured
      expect(appConfig.expo.icon).toBe('./assets/icon.png');
    });

    it('should have proper deep linking configuration', () => {
      const scheme = appConfig.expo.scheme;
      const iosDomains = appConfig.expo.ios?.associatedDomains;
      const androidIntents = appConfig.expo.android?.intentFilters;
      
      expect(scheme).toBe('andfriends');
      expect(iosDomains).toContain('applinks:andfriends.app');
      
      const hasHttpsIntent = androidIntents?.some((filter: any) =>
        filter.data?.some((data: any) => 
          data.scheme === 'https' && data.host === 'andfriends.app'
        )
      );
      expect(hasHttpsIntent).toBe(true);
    });
  });

  describe('Performance and Best Practices', () => {
    it('should have optimized asset bundle patterns', () => {
      const assetBundlePatterns = appConfig.expo.assetBundlePatterns;
      
      expect(assetBundlePatterns).toBeDefined();
      expect(Array.isArray(assetBundlePatterns)).toBe(true);
      expect(assetBundlePatterns).toContain('**/*');
    });

    it('should support automatic UI style', () => {
      expect(appConfig.expo.userInterfaceStyle).toBe('automatic');
    });

    it('should have web configuration for development', () => {
      const web = appConfig.expo.web;
      
      expect(web).toBeDefined();
      expect(web.favicon).toBe('./assets/favicon.png');
    });
  });
});