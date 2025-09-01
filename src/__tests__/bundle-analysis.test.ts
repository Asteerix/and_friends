import fs from 'fs';
import path from 'path';

describe('Bundle Size and Performance Optimization', () => {
  const srcDir = path.join(__dirname, '..');
  
  const getFilesRecursively = (dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] => {
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
      console.warn(`Cannot read directory ${dir}:`, error);
    }
    
    return files;
  };

  const analyzeFileSize = (filePath: string): { size: number, lines: number } => {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      return { size: stats.size, lines };
    } catch (error) {
      return { size: 0, lines: 0 };
    }
  };

  describe('File Structure Analysis', () => {
    it('should have reasonable file sizes', () => {
      const files = getFilesRecursively(srcDir);
      const largeFiles: Array<{ file: string; size: number; lines: number }> = [];
      let totalSize = 0;
      let totalLines = 0;

      files.forEach(file => {
        const analysis = analyzeFileSize(file);
        totalSize += analysis.size;
        totalLines += analysis.lines;

        if (analysis.size > 50000) { // Files larger than 50KB
          largeFiles.push({
            file: path.relative(srcDir, file),
            size: analysis.size,
            lines: analysis.lines,
          });
        }
      });

      console.log(`📊 Bundle Analysis:`);
      console.log(`   Total files: ${files.length}`);
      console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`   Total lines: ${totalLines.toLocaleString()}`);
      console.log(`   Average file size: ${(totalSize / files.length / 1024).toFixed(2)} KB`);

      if (largeFiles.length > 0) {
        console.log(`⚠️ Large files (>50KB):`);
        largeFiles.forEach(({ file, size, lines }) => {
          console.log(`   ${file}: ${(size / 1024).toFixed(2)} KB (${lines} lines)`);
        });
      }

      // Reasonable limits for a mobile app
      expect(files.length).toBeLessThan(1000); // Not too many files
      expect(totalSize / 1024).toBeLessThan(10000); // Less than 10MB source code
      expect(largeFiles.length).toBeLessThan(10); // Not too many large files
    });

    it('should have proper code organization', () => {
      const files = getFilesRecursively(srcDir);
      
      const filesByDirectory = files.reduce((acc, file) => {
        const relativePath = path.relative(srcDir, file);
        const directory = relativePath.split('/')[0];
        if (directory) {
          if (!acc[directory]) acc[directory] = [];
          acc[directory].push(file);
        }
        return acc;
      }, {} as Record<string, string[]>);

      console.log(`📁 Directory structure:`);
      Object.entries(filesByDirectory)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([dir, files]) => {
          console.log(`   ${dir}: ${files.length} files`);
        });

      // Should have feature-based organization
      expect(filesByDirectory['features']).toBeDefined();
      expect(filesByDirectory['shared']).toBeDefined();
      expect(filesByDirectory['app']).toBeDefined();

      // Features should be the largest directory
      expect(filesByDirectory['features']?.length).toBeGreaterThan(100);
    });
  });

  describe('Import Analysis', () => {
    it('should avoid circular dependencies', () => {
      const files = getFilesRecursively(srcDir, ['.ts', '.tsx']);
      const imports = new Map<string, string[]>();
      const circularDependencies: string[] = [];

      // Parse imports from files
      files.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const relativePath = path.relative(srcDir, file);
          const fileImports: string[] = [];

          // Find import statements
          const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath && (importPath.startsWith('@/') || importPath.startsWith('./') || importPath.startsWith('../'))) {
              fileImports.push(importPath);
            }
          }

          imports.set(relativePath, fileImports);
        } catch (error) {
          // File might not be readable
        }
      });

      // Simple circular dependency check (depth 2)
      imports.forEach((fileImports, file) => {
        fileImports.forEach(importPath => {
          if (!importPath) return;
          const resolvedImport = path.normalize(path.join(path.dirname(file), importPath));
          const importedFileImports = imports.get(resolvedImport) || [];
          
          if (importedFileImports.some(secondLevelImport => {
            const resolvedSecondLevel = path.normalize(path.join(path.dirname(resolvedImport), secondLevelImport));
            return resolvedSecondLevel === file;
          })) {
            circularDependencies.push(`${file} ↔ ${resolvedImport}`);
          }
        });
      });

      if (circularDependencies.length > 0) {
        console.log(`⚠️ Potential circular dependencies:`);
        circularDependencies.forEach(dep => console.log(`   ${dep}`));
      }

      // Should have minimal circular dependencies
      expect(circularDependencies.length).toBeLessThan(5);
    });

    it('should use barrel exports efficiently', () => {
      const files = getFilesRecursively(srcDir, ['.ts', '.tsx']);
      const indexFiles = files.filter(file => path.basename(file, path.extname(file)) === 'index');
      
      console.log(`📦 Barrel exports:`);
      console.log(`   Index files found: ${indexFiles.length}`);

      indexFiles.forEach(file => {
        const relativePath = path.relative(srcDir, file);
        console.log(`   ${relativePath}`);
      });

      // Should have some barrel exports for organization
      expect(indexFiles.length).toBeGreaterThan(5);
      expect(indexFiles.length).toBeLessThan(50); // But not too many
    });
  });

  describe('Code Quality Metrics', () => {
    it('should have reasonable file complexity', () => {
      const files = getFilesRecursively(srcDir, ['.ts', '.tsx']);
      const complexFiles: Array<{ file: string; complexity: number }> = [];

      files.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const relativePath = path.relative(srcDir, file);

          // Simple complexity metrics
          const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
          const ifStatements = (content.match(/if\s*\(/g) || []).length;
          const loops = (content.match(/(for|while)\s*\(/g) || []).length;
          const complexity = functionCount + ifStatements + loops;

          if (complexity > 100) {
            complexFiles.push({
              file: relativePath,
              complexity,
            });
          }
        } catch (error) {
          // File might not be readable
        }
      });

      if (complexFiles.length > 0) {
        console.log(`⚠️ Complex files (>100 complexity points):`);
        complexFiles.forEach(({ file, complexity }) => {
          console.log(`   ${file}: ${complexity} points`);
        });
      }

      // Should have reasonable complexity
      expect(complexFiles.length).toBeLessThan(20);
    });

    it('should have proper test coverage structure', () => {
      const testFiles = getFilesRecursively(srcDir, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);
      const sourceFiles = getFilesRecursively(srcDir, ['.ts', '.tsx']).filter(file => 
        !file.includes('__tests__') && 
        !file.includes('.test.') && 
        !file.includes('.spec.') &&
        !file.includes('types.ts') &&
        !file.includes('.d.ts')
      );

      console.log(`🧪 Test coverage structure:`);
      console.log(`   Test files: ${testFiles.length}`);
      console.log(`   Source files: ${sourceFiles.length}`);
      console.log(`   Test ratio: ${(testFiles.length / sourceFiles.length * 100).toFixed(1)}%`);

      // Should have reasonable test coverage
      expect(testFiles.length).toBeGreaterThan(5);
      expect(testFiles.length / sourceFiles.length).toBeGreaterThan(0.01); // At least 1% test files
    });
  });

  describe('Performance Considerations', () => {
    it('should minimize heavy dependencies usage', () => {
      const files = getFilesRecursively(srcDir, ['.ts', '.tsx']);
      const heavyImports = new Set<string>();
      const potentiallyHeavyLibraries = [
        'lodash',
        'moment',
        'date-fns',
        'react-native-vector-icons',
        '@expo/vector-icons',
      ];

      files.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          potentiallyHeavyLibraries.forEach(lib => {
            if (content.includes(`from '${lib}'`) || content.includes(`from "${lib}"`)) {
              heavyImports.add(lib);
            }
          });
        } catch (error) {
          // File might not be readable
        }
      });

      console.log(`📚 Heavy dependencies detected:`);
      heavyImports.forEach(lib => {
        console.log(`   ${lib}`);
      });

      // Should minimize heavy dependencies
      expect(heavyImports.size).toBeLessThan(10);
    });

    it('should use efficient React patterns', () => {
      const files = getFilesRecursively(srcDir, ['.tsx']);
      const reactPatterns = {
        useCallback: 0,
        useMemo: 0,
        React_memo: 0,
        useState: 0,
        useEffect: 0,
      };

      files.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          reactPatterns.useCallback += (content.match(/useCallback/g) || []).length;
          reactPatterns.useMemo += (content.match(/useMemo/g) || []).length;
          reactPatterns.React_memo += (content.match(/React\.memo|export default.*memo\(/g) || []).length;
          reactPatterns.useState += (content.match(/useState/g) || []).length;
          reactPatterns.useEffect += (content.match(/useEffect/g) || []).length;
        } catch (error) {
          // File might not be readable
        }
      });

      console.log(`⚛️ React optimization patterns:`);
      Object.entries(reactPatterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} usages`);
      });

      // Should use optimization patterns
      expect(reactPatterns.useCallback + reactPatterns.useMemo + reactPatterns.React_memo).toBeGreaterThan(10);
      
      // Should have reasonable hook usage
      expect(reactPatterns.useState).toBeGreaterThan(50);
      expect(reactPatterns.useEffect).toBeGreaterThan(30);
    });
  });

  describe('Asset Optimization', () => {
    it('should have optimized asset structure', () => {
      const assetDirs = [
        path.join(process.cwd(), 'assets'),
        path.join(srcDir, 'assets'),
      ];

      let totalAssets = 0;
      let totalAssetSize = 0;

      assetDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const assets = getFilesRecursively(dir, ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.mp4', '.mov']);
          totalAssets += assets.length;

          assets.forEach(asset => {
            try {
              const stats = fs.statSync(asset);
              totalAssetSize += stats.size;
            } catch (error) {
              // Asset might not be accessible
            }
          });
        }
      });

      console.log(`🖼️ Asset optimization:`);
      console.log(`   Total assets: ${totalAssets}`);
      console.log(`   Total asset size: ${(totalAssetSize / 1024 / 1024).toFixed(2)} MB`);

      if (totalAssets > 0) {
        console.log(`   Average asset size: ${(totalAssetSize / totalAssets / 1024).toFixed(2)} KB`);
      }

      // Should have reasonable asset sizes for mobile
      expect(totalAssetSize / 1024 / 1024).toBeLessThan(50); // Less than 50MB total assets
    });
  });
});