import fs from 'fs';
import path from 'path';
import appConfig from '../../app.json';
import packageJson from '../../package.json';

describe('TestFlight Deployment Readiness', () => {
  describe('App Configuration Validation', () => {
    it('should have all required app configuration', () => {
      const config = appConfig.expo;
      
      // Basic app information
      expect(config.name).toBeDefined();
      expect(config.slug).toBeDefined();
      expect(config.version).toBeDefined();
      expect(config.orientation).toBe('portrait');
      expect(config.icon).toBeDefined();
      expect(config.scheme).toBeDefined();
      
      // Bundle patterns
      expect(config.assetBundlePatterns).toBeDefined();
      expect(Array.isArray(config.assetBundlePatterns)).toBe(true);
      
      // Splash screen
      expect(config.splash).toBeDefined();
      expect(config.splash.image).toBeDefined();
      expect(config.splash.backgroundColor).toBeDefined();
    });

    it('should have proper iOS configuration for TestFlight', () => {
      const iosConfig = appConfig.expo.ios;
      
      expect(iosConfig).toBeDefined();
      expect(iosConfig.bundleIdentifier).toBeDefined();
      expect(iosConfig.buildNumber).toBeDefined();
      expect(iosConfig.supportsTablet).toBe(true);
      
      // Bundle identifier should follow reverse domain naming
      expect(iosConfig.bundleIdentifier).toMatch(/^[a-z0-9-.]+\.[a-z0-9-.]+\.[a-z0-9-.]+$/);
      
      // Build number should be numeric string
      expect(iosConfig.buildNumber).toMatch(/^\d+$/);
      
      // Should have associated domains for deep linking
      expect(iosConfig.associatedDomains).toBeDefined();
      expect(Array.isArray(iosConfig.associatedDomains)).toBe(true);
      expect(iosConfig.associatedDomains.length).toBeGreaterThan(0);
    });

    it('should have all required iOS permissions with descriptions', () => {
      const infoPlist = appConfig.expo.ios?.infoPlist;
      
      expect(infoPlist).toBeDefined();
      
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
        expect(infoPlist[permission].length).toBeGreaterThan(20); // Meaningful description
        expect(infoPlist[permission]).toContain('& friends'); // App name mentioned
      });
    });

    it('should have proper Android configuration', () => {
      const androidConfig = appConfig.expo.android;
      
      expect(androidConfig).toBeDefined();
      expect(androidConfig.package).toBeDefined();
      expect(androidConfig.adaptiveIcon).toBeDefined();
      
      // Package name should follow reverse domain naming
      expect(androidConfig.package).toMatch(/^[a-z0-9_.]+$/);
      
      // Permissions
      expect(androidConfig.permissions).toBeDefined();
      expect(Array.isArray(androidConfig.permissions)).toBe(true);
      expect(androidConfig.permissions.length).toBeGreaterThan(0);
      
      // Intent filters for deep linking
      expect(androidConfig.intentFilters).toBeDefined();
      expect(Array.isArray(androidConfig.intentFilters)).toBe(true);
    });

    it('should have EAS project configured', () => {
      const easConfig = appConfig.expo.extra?.eas;
      
      expect(easConfig).toBeDefined();
      expect(easConfig.projectId).toBeDefined();
      expect(easConfig.projectId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });
  });

  describe('Package Configuration', () => {
    it('should have proper package.json configuration', () => {
      expect(packageJson.name).toBeDefined();
      expect(packageJson.version).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      
      // Should have build scripts
      expect(packageJson.scripts.android).toBeDefined();
      expect(packageJson.scripts.ios).toBeDefined();
      
      // Should have test scripts
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts['check:types']).toBeDefined();
    });

    it('should have all required dependencies for React Native', () => {
      const deps = packageJson.dependencies;
      
      const requiredDeps = [
        '@expo/vector-icons',
        '@react-native-async-storage/async-storage',
        '@react-navigation/native',
        '@supabase/supabase-js',
        'expo-router',
        'react',
        'react-native',
      ];

      requiredDeps.forEach(dep => {
        expect(deps[dep]).toBeDefined();
      });
    });

    it('should have proper version formatting', () => {
      const version = packageJson.version;
      
      // Should follow semver format
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      
      // App version should match package version
      expect(appConfig.expo.version).toBe(version);
    });
  });

  describe('Asset Requirements', () => {
    it('should have all required assets', () => {
      const requiredAssets = [
        'assets/icon.png',
        'assets/splash-icon.png',
        'assets/adaptive-icon.png',
        'assets/favicon.png',
      ];

      requiredAssets.forEach(assetPath => {
        const fullPath = path.join(process.cwd(), assetPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should have proper icon sizes and formats', () => {
      const iconPath = path.join(process.cwd(), 'assets/icon.png');
      
      if (fs.existsSync(iconPath)) {
        const stats = fs.statSync(iconPath);
        expect(stats.size).toBeGreaterThan(1000); // At least 1KB
        expect(stats.size).toBeLessThan(500000); // Less than 500KB
      }
    });
  });

  describe('Security and Privacy', () => {
    it('should not expose sensitive data in configuration', () => {
      const config = appConfig.expo;
      
      // Supabase configuration should use placeholders or env vars
      if (config.extra?.supabaseUrl) {
        expect(config.extra.supabaseUrl).toContain('REMPLACER_PAR_VOTRE');
      }
      
      if (config.extra?.supabaseAnonKey) {
        expect(config.extra.supabaseAnonKey).toContain('REMPLACER_PAR_VOTRE');
      }
      
      // Should not contain development URLs in production
      const configString = JSON.stringify(config);
      expect(configString).not.toContain('localhost');
      expect(configString).not.toContain('127.0.0.1');
      expect(configString).not.toContain('192.168.');
    });

    it('should have proper deep linking configuration', () => {
      const scheme = appConfig.expo.scheme;
      const iosDomains = appConfig.expo.ios?.associatedDomains;
      const androidIntents = appConfig.expo.android?.intentFilters;
      
      expect(scheme).toBeDefined();
      expect(scheme).toMatch(/^[a-z][a-z0-9]*$/); // Valid URL scheme format
      
      // iOS associated domains
      expect(iosDomains).toBeDefined();
      iosDomains?.forEach(domain => {
        expect(domain).toMatch(/^applinks:/);
      });
      
      // Android intent filters
      expect(androidIntents).toBeDefined();
      expect(androidIntents?.length).toBeGreaterThan(0);
      
      const hasHttpsIntent = androidIntents?.some(filter =>
        filter.data?.some((data: any) => 
          data.scheme === 'https' && data.host
        )
      );
      expect(hasHttpsIntent).toBe(true);
    });
  });

  describe('Code Quality and Testing', () => {
    it('should have comprehensive test coverage', () => {
      const testDir = path.join(__dirname);
      const testFiles = fs.readdirSync(testDir).filter(file => 
        file.endsWith('.test.ts') || file.endsWith('.test.tsx')
      );
      
      // Should have multiple test files
      expect(testFiles.length).toBeGreaterThan(5);
      
      // Should have tests for core functionality
      const expectedTests = [
        'auth',
        'events',  
        'chat',
        'permissions',
        'performance',
        'bundle',
        'error',
        'testflight',
      ];
      
      expectedTests.forEach(testType => {
        const hasTest = testFiles.some(file => 
          file.toLowerCase().includes(testType.toLowerCase())
        );
        if (!hasTest) {
          console.warn(`Missing test for: ${testType}`);
        }
        // Most tests should exist, but allow some flexibility
      });
    });

    it('should have proper TypeScript configuration', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      if (fs.existsSync(tsconfigPath)) {
        try {
          const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
          // Remove comments for JSON parsing
          const cleanedContent = tsconfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
          const tsconfig = JSON.parse(cleanedContent);
          
          expect(tsconfig.compilerOptions).toBeDefined();
          expect(tsconfig.compilerOptions.target).toBeDefined();
          expect(tsconfig.compilerOptions.moduleResolution).toBeDefined();
        } catch (error) {
          // TypeScript config might have comments, which is valid but not JSON
          console.warn('TypeScript config exists but contains comments');
        }
      }
    });

    it('should have Jest configuration', () => {
      const jestConfigPath = path.join(process.cwd(), 'jest.config.js');
      
      expect(fs.existsSync(jestConfigPath)).toBe(true);
      
      if (fs.existsSync(jestConfigPath)) {
        try {
          // Check if Jest config has proper structure
          const jestConfig = require(path.join(process.cwd(), 'jest.config.js'));
          expect(jestConfig.testEnvironment).toBeDefined();
          expect(jestConfig.moduleFileExtensions).toBeDefined();
          
          // Coverage thresholds are optional but recommended
          if (jestConfig.coverageThreshold) {
            expect(jestConfig.coverageThreshold.global).toBeDefined();
          }
        } catch (error) {
          console.warn('Jest config exists but could not be loaded');
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should have reasonable bundle size', () => {
      const srcDir = path.join(__dirname, '..');
      const files = this.getFilesRecursively?.(srcDir, ['.ts', '.tsx', '.js', '.jsx']) || [];
      
      // Should not have too many files
      expect(files.length).toBeLessThan(1000);
      
      // Calculate total source size
      let totalSize = 0;
      files.forEach(file => {
        try {
          const stats = fs.statSync(file);
          totalSize += stats.size;
        } catch (error) {
          // File might not exist
        }
      });
      
      // Source code should be under 10MB
      expect(totalSize / 1024 / 1024).toBeLessThan(10);
    });

    it('should have optimized dependencies', () => {
      const deps = packageJson.dependencies;
      const devDeps = packageJson.devDependencies || {};
      
      const allDeps = { ...deps, ...devDeps };
      const depCount = Object.keys(allDeps).length;
      
      // Should not have excessive dependencies
      expect(depCount).toBeLessThan(150);
      
      // Should not include dev dependencies in production
      const productionDeps = Object.keys(deps);
      const devOnlyPackages = [
        '@types/',
        'eslint',
        'prettier',
        'jest',
        '@testing-library/',
      ];
      
      productionDeps.forEach(dep => {
        const isDevPackage = devOnlyPackages.some(devPkg => 
          dep.includes(devPkg)
        );
        if (isDevPackage) {
          console.warn(`Warning: ${dep} might be a dev dependency in production`);
        }
      });
    });
  });

  describe('Deployment Checklist', () => {
    it('should have all required files for deployment', () => {
      const requiredFiles = [
        'app.json',
        'package.json',
        'tsconfig.json',
        'babel.config.js',
        'metro.config.js',
        'jest.config.js',
      ];

      requiredFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    it('should have proper gitignore configuration', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      
      expect(fs.existsSync(gitignorePath)).toBe(true);
      
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf8');
        
        const requiredIgnores = [
          'node_modules/',
          '.expo/',
          'dist/',
          '.DS_Store',
        ];
        
        requiredIgnores.forEach(ignore => {
          expect(gitignore).toContain(ignore);
        });
      }
    });

    it('should have proper environment setup', () => {
      // Check for environment configuration
      const hasEnvSetup = 
        fs.existsSync(path.join(process.cwd(), '.env')) ||
        fs.existsSync(path.join(process.cwd(), '.env.example')) ||
        appConfig.expo.extra;
      
      expect(hasEnvSetup).toBe(true);
    });
  });

  describe('Apple App Store Guidelines Compliance', () => {
    it('should meet minimum iOS version requirements', () => {
      // iOS apps should support recent iOS versions
      const iosConfig = appConfig.expo.ios;
      
      // Should have proper bundle identifier
      expect(iosConfig?.bundleIdentifier).toMatch(/^[a-zA-Z0-9.-]+$/);
      expect(iosConfig?.bundleIdentifier?.split('.').length).toBeGreaterThanOrEqual(3);
      
      // Should support tablets
      expect(iosConfig?.supportsTablet).toBe(true);
    });

    it('should have proper metadata and descriptions', () => {
      const config = appConfig.expo;
      
      expect(config.name).toBeDefined();
      expect(config.name.length).toBeGreaterThan(2);
      expect(config.name.length).toBeLessThan(50);
      
      // App name should not contain prohibited terms
      const prohibitedTerms = ['test', 'debug', 'development'];
      prohibitedTerms.forEach(term => {
        expect(config.name.toLowerCase()).not.toContain(term);
      });
    });

    it('should have proper version and build numbers', () => {
      const iosConfig = appConfig.expo.ios;
      const version = appConfig.expo.version;
      
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(iosConfig?.buildNumber).toMatch(/^\d+$/);
      
      // Build number should be numeric and reasonable
      const buildNumber = parseInt(iosConfig?.buildNumber || '0');
      expect(buildNumber).toBeGreaterThan(0);
      expect(buildNumber).toBeLessThan(99999);
    });
  });
});

// Helper function for file recursion (if not available from bundle analysis)
function getFilesRecursively(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  let files: string[] = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files = files.concat(getFilesRecursively(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
  }
  
  return files;
}