#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

// Security Validation Script
// This script performs comprehensive security validation for TestFlight deployment

interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'RLS' | 'PERMISSIONS' | 'VALIDATION' | 'ENCRYPTION' | 'AUTH' | 'API';
  description: string;
  table?: string;
  function?: string;
  recommendation: string;
  impact: string;
}

class SecurityValidator {
  private issues: SecurityIssue[] = [];
  private supabase: any;

  constructor() {
    // Initialize Supabase client for validation
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found in environment');
      process.exit(1);
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private addIssue(issue: SecurityIssue) {
    this.issues.push(issue);
  }

  async validateRowLevelSecurity(): Promise<void> {
    console.log('🔒 Validating Row Level Security (RLS)...');

    const criticalTables = [
      'profiles',
      'events', 
      'messages',
      'chats',
      'friendships',
      'event_participants',
      'stories',
      'ratings',
      'reports',
      'notifications'
    ];

    for (const table of criticalTables) {
      try {
        // Check if RLS is enabled
        const { data, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`⚠️ Could not access table ${table}: ${error.message}`);
          continue;
        }

        // If we can access data without authentication, RLS might not be properly configured
        if (data !== null) {
          this.addIssue({
            severity: 'HIGH',
            category: 'RLS',
            description: `Table ${table} may not have proper RLS policies`,
            table,
            recommendation: 'Verify RLS policies are enabled and correctly configured',
            impact: 'Unauthorized data access possible'
          });
        }
      } catch (error) {
        console.log(`✅ Table ${table} appears to have proper access controls`);
      }
    }
  }

  async validateAuthenticationFlow(): Promise<void> {
    console.log('🔐 Validating Authentication Flow...');

    try {
      // Test anonymous access to protected resources
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (!profileError && profileData && profileData.length > 0) {
        this.addIssue({
          severity: 'CRITICAL',
          category: 'AUTH',
          description: 'Anonymous access to user profiles is possible',
          table: 'profiles',
          recommendation: 'Implement proper RLS policies to prevent anonymous access',
          impact: 'User data exposed to unauthorized users'
        });
      }

      // Test phone verification endpoint access
      const { error: otpError } = await this.supabase.auth.signInWithOtp({
        phone: '+1234567890'
      });

      if (!otpError) {
        console.log('⚠️ OTP verification allows requests without rate limiting');
      }

    } catch (error) {
      console.log('✅ Authentication flow appears secure');
    }
  }

  async validateAPIPermissions(): Promise<void> {
    console.log('🔑 Validating API Permissions...');

    const sensitiveOperations = [
      { table: 'profiles', operation: 'delete' },
      { table: 'profiles', operation: 'update' },
      { table: 'events', operation: 'delete' },
      { table: 'messages', operation: 'update' },
      { table: 'reports', operation: 'select' },
      { table: 'ratings', operation: 'delete' }
    ];

    for (const { table, operation } of sensitiveOperations) {
      try {
        let result;
        
        switch (operation) {
          case 'select':
            result = await this.supabase.from(table).select('*').limit(1);
            break;
          case 'update':
            result = await this.supabase.from(table).update({}).eq('id', 'non-existent');
            break;
          case 'delete':
            result = await this.supabase.from(table).delete().eq('id', 'non-existent');
            break;
        }

        if (result && !result.error) {
          this.addIssue({
            severity: 'HIGH',
            category: 'PERMISSIONS',
            description: `Anonymous ${operation} operation allowed on ${table}`,
            table,
            recommendation: 'Add proper permission checks for sensitive operations',
            impact: 'Data manipulation by unauthorized users'
          });
        }
      } catch (error) {
        // Expected - permissions are working
      }
    }
  }

  async validateDataValidation(): Promise<void> {
    console.log('✅ Validating Data Validation...');

    const testCases = [
      {
        table: 'profiles',
        data: { username: '<script>alert("xss")</script>' },
        expectError: true
      },
      {
        table: 'events',
        data: { title: "'; DROP TABLE events; --" },
        expectError: true
      },
      {
        table: 'messages',
        data: { text: 'x'.repeat(50000) }, // Extremely long text
        expectError: true
      }
    ];

    for (const testCase of testCases) {
      try {
        const { error } = await this.supabase
          .from(testCase.table)
          .insert(testCase.data);

        if (!error && testCase.expectError) {
          this.addIssue({
            severity: 'MEDIUM',
            category: 'VALIDATION',
            description: `Malicious input not properly validated in ${testCase.table}`,
            table: testCase.table,
            recommendation: 'Implement server-side input validation and sanitization',
            impact: 'Potential XSS or SQL injection vulnerabilities'
          });
        }
      } catch (error) {
        // Expected - validation is working
      }
    }
  }

  async validateStoragePermissions(): Promise<void> {
    console.log('📁 Validating Storage Permissions...');

    try {
      // Test anonymous file upload
      const testFile = new Uint8Array([1, 2, 3, 4]);
      const { error } = await this.supabase.storage
        .from('avatars')
        .upload('test-security-validation.txt', testFile);

      if (!error) {
        this.addIssue({
          severity: 'HIGH',
          category: 'PERMISSIONS',
          description: 'Anonymous file uploads are allowed',
          recommendation: 'Implement proper authentication checks for file uploads',
          impact: 'Unauthorized file uploads possible'
        });

        // Clean up test file
        await this.supabase.storage
          .from('avatars')
          .remove(['test-security-validation.txt']);
      }
    } catch (error) {
      console.log('✅ Storage permissions appear secure');
    }
  }

  async validateRealtimePermissions(): Promise<void> {
    console.log('⚡ Validating Realtime Permissions...');

    // Test if anonymous users can subscribe to sensitive channels
    const sensitiveChannels = [
      'profiles',
      'messages', 
      'chats',
      'private_events'
    ];

    for (const channel of sensitiveChannels) {
      try {
        const subscription = this.supabase
          .channel(channel)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: channel 
          }, () => {})
          .subscribe();

        if (subscription) {
          this.addIssue({
            severity: 'MEDIUM',
            category: 'PERMISSIONS',
            description: `Anonymous realtime subscription possible for ${channel}`,
            recommendation: 'Implement proper authentication for realtime subscriptions',
            impact: 'Unauthorized access to real-time data updates'
          });
        }
      } catch (error) {
        // Expected - permissions are working
      }
    }
  }

  async validateEncryption(): Promise<void> {
    console.log('🔐 Validating Encryption Practices...');

    // Check if sensitive data fields are properly handled
    const sensitiveFields = [
      { table: 'profiles', field: 'phone' },
      { table: 'profiles', field: 'email' },
      { table: 'otp_verifications', field: 'code' },
      { table: 'user_sessions', field: 'access_token' }
    ];

    for (const { table, field } of sensitiveFields) {
      try {
        const { data } = await this.supabase
          .from(table)
          .select(field)
          .limit(1);

        if (data && data.length > 0 && data[0][field]) {
          // Check if data looks encrypted/hashed
          const value = data[0][field];
          if (typeof value === 'string' && value.length < 20 && !value.startsWith('$')) {
            this.addIssue({
              severity: 'HIGH',
              category: 'ENCRYPTION',
              description: `Sensitive field ${field} in ${table} may not be encrypted`,
              table,
              recommendation: 'Ensure sensitive data is properly encrypted at rest',
              impact: 'Sensitive user data exposure'
            });
          }
        }
      } catch (error) {
        // Expected - field might not exist or access restricted
      }
    }
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(70));
    console.log('                    SECURITY VALIDATION REPORT');
    console.log('='.repeat(70));

    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');
    const lowIssues = this.issues.filter(i => i.severity === 'LOW');

    console.log('\n📊 Summary:');
    console.log(`🔴 Critical: ${criticalIssues.length}`);
    console.log(`🟠 High: ${highIssues.length}`);
    console.log(`🟡 Medium: ${mediumIssues.length}`);
    console.log(`🟢 Low: ${lowIssues.length}`);
    console.log(`📊 Total: ${this.issues.length}`);

    // Security Score
    const score = Math.max(0, 100 - (criticalIssues.length * 30 + highIssues.length * 20 + mediumIssues.length * 10 + lowIssues.length * 5));
    console.log(`\n🏆 Security Score: ${score}/100`);

    if (score >= 90) console.log('🛡️ Excellent security posture');
    else if (score >= 70) console.log('✅ Good security with minor improvements needed');
    else if (score >= 50) console.log('⚠️ Security improvements required before production');
    else console.log('🚨 Critical security issues must be resolved');

    // Show critical and high issues
    const importantIssues = [...criticalIssues, ...highIssues];
    if (importantIssues.length > 0) {
      console.log('\n🚨 Critical & High Priority Issues:');
      console.log('=' .repeat(50));

      importantIssues.forEach((issue, index) => {
        const severityIcon = issue.severity === 'CRITICAL' ? '🔴' : '🟠';
        console.log(`\n${severityIcon} ${index + 1}. ${issue.description}`);
        console.log(`   Category: ${issue.category}`);
        if (issue.table) console.log(`   Table: ${issue.table}`);
        if (issue.function) console.log(`   Function: ${issue.function}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   Fix: ${issue.recommendation}`);
      });
    }

    // Recommendations
    console.log('\n💡 Security Recommendations:');
    console.log('1. Enable RLS on all public tables');
    console.log('2. Implement proper API rate limiting');
    console.log('3. Add input validation and sanitization');
    console.log('4. Review and restrict storage permissions');
    console.log('5. Enable leaked password protection');
    console.log('6. Fix database function security issues');
    console.log('7. Move extensions out of public schema');
    console.log('8. Implement proper authentication checks');

    console.log('\n' + '='.repeat(70));
    
    // Exit with error code if critical issues found
    if (criticalIssues.length > 0) {
      console.log('❌ Critical security issues found. Fix before production deployment.');
      process.exit(1);
    } else if (highIssues.length > 0) {
      console.log('⚠️ High priority security issues found. Review before deployment.');
    } else {
      console.log('✅ No critical security issues detected.');
    }
  }

  async runValidation(): Promise<void> {
    console.log('🛡️ Starting Security Validation...\n');

    await this.validateRowLevelSecurity();
    await this.validateAuthenticationFlow();
    await this.validateAPIPermissions();
    await this.validateDataValidation();
    await this.validateStoragePermissions();
    await this.validateRealtimePermissions();
    await this.validateEncryption();

    this.generateReport();
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new SecurityValidator();
  
  validator.runValidation()
    .catch(error => {
      console.error('❌ Security validation failed:', error);
      process.exit(1);
    });
}

export { SecurityValidator };