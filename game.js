Create a file projects/roguelike/game.js
[code]
/**
 * Roguelike Game Module
 * @module game
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ===== Configuration =====
const CONFIG = {
  // Test configuration
  test: {
    paths: ['test', 'tests', 'src/test'],
    patterns: ['*.test.js', '*.spec.js', 'test-*.js'],
    timeout: 5000,
    coverage: {
      enabled: true,
      threshold: 80,
      exclude: ['node_modules', 'dist', 'coverage']
    }
  },
  // Game settings
  game: {
    title: 'Roguelike Adventure',
    version: '1.0.0',
    maxLevel: 10,
    tileSize: 32,
    scoreIncrement: 100
  }
};

// ===== Configuration Validator =====
class ConfigValidator {
  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  static validate(config) {
    const errors = [];
    const warnings = [];

    // Validate test paths
    if (!config.test?.paths || !Array.isArray(config.test.paths) || config.test.paths.length === 0) {
      warnings.push('No test paths configured, using default ["test"]');
      config.test = { ...config.test, paths: ['test'] };
    }

    // Validate test patterns
    if (!config.test?.patterns || !Array.isArray(config.test.patterns) || config.test.patterns.length === 0) {
      warnings.push('No test patterns configured, using default ["*.test.js"]');
      config.test = { ...config.test, patterns: ['*.test.js'] };
    }

    // Validate game settings
    if (!config.game?.maxLevel || config.game.maxLevel < 1) {
      errors.push('maxLevel must be a positive number');
    }

    if (!config.game?.title || typeof config.game.title !== 'string') {
      errors.push('title must be a non-empty string');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config
    };
  }
}

// ===== Glob Pattern Helper =====
class GlobHelper {
  /**
   * Convert glob pattern to regex
   * @param {string} pattern - Glob pattern
   * @returns {RegExp} Regular expression
   */
  static globToRegex(pattern) {
    // Escape regex special characters except *
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Convert * to .* for regex
    return new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
  }
}

// ===== Test Discovery =====
class TestDiscoverer {
  /**
   * Find test files based on configuration
   * @param {Array<string>} paths - Directory paths to search
   * @param {Array<string>} patterns - File patterns to match
   * @param {Object} fileSystem - File system interface (for DI)
   * @returns {Array<string>} List of test file paths
   */
  static findTests(
    paths = CONFIG.test.paths,
    patterns = CONFIG.test.patterns,
    fileSystem = fs
  ) {
    // Validate inputs
    const validation = ConfigValidator.validate({ test: { paths, patterns } });
    if (validation.warnings.length > 0) {
      console.warn('Test configuration warnings:', validation.warnings);
    }
    
    const validPaths = validation.config.test.paths;
    const validPatterns = validation.config.test.patterns;

    const discoveredTests = [];
    const excludePatterns = CONFIG.test.coverage.exclude.map(p => path.join(p, '**/*'));

    for (const basePath of validPaths) {
      // Check if path exists
      if (!fileSystem.existsSync(basePath)) {
        console.warn(`Test path "${basePath}" does not exist, skipping...`);
        continue;
      }

      for (const pattern of validPatterns) {
        const fullPattern = path.join(basePath, pattern);
        try {
          const matches = glob.sync(fullPattern, {
            ignore: excludePatterns,
            nodir: true,
            absolute: false
          });
          discoveredTests.push(...matches);
        } catch (error) {
          console.error(`Error finding tests with pattern "${fullPattern}":`, error.message);
        }
      }
    }

    // Remove duplicates, handle case-insensitive filesystems, and sort
    const uniqueTests = [];
    const seen = new Set();
    for (const test of discoveredTests) {
      const normalized = test.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueTests.push(test);
      }
    }

    return uniqueTests.sort();
  }

  /**
   * Validate test file paths
   * @param {Array<string>} files - Test file paths
   * @returns {Object} Validation result
   */
  static validateTests(files) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      count: files.length
    };

    if (files.length === 0) {
      result.valid = false;
      result.errors.push('No test files found. Check test paths and patterns.');
      result.warnings.push('Consider adjusting testpaths configuration.');
    }

    for (const file of files) {
      if (!file.endsWith('.js')) {
        result.warnings.push(`File "${file}" is not a JavaScript file.`);
      }
    }

    return result;
  }
}

// ===== Game Mode Strategy =====
class GameMode {
  /**
   * Start the game in this mode
   * @param {GameEngine} game - Game engine instance
   * @returns {Object} Game state
   */
  start(game) {
    throw new Error('start() must be implemented by subclass');
  }
}

class ProductionMode extends GameMode {
  /**
   * Start game in production mode
   * @param {GameEngine} game - Game engine instance
   * @returns {Object} Game state
   */
  start(game) {
    return game._getInitialState();
  }
}

class TestMode extends GameMode {
  /**
   * Start game in test mode
   * @param {GameEngine} game - Game engine instance
   * @returns {Object} Game state
   */
  start(game) {
    // Validate test configuration when in test mode
    const testDiscovery = TestDiscoverer.findTests();
    const validation = TestDiscoverer.validateTests(testDiscovery);

    if (!validation.valid) {
      console.error('Test validation failed:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('Test warnings:', validation.warnings);
    }

    return {
      testMode: true,
      testsFound: validation.count,
      testsList: testDiscovery,
      validation: validation,
      ...game._getInitialState()
    };
  }
}

// ===== Game Engine =====
class GameEngine {
  /**
   * Create a new game engine
   * @param {Object} config - Configuration overrides
   * @param {Object} fileSystem - File system interface (for DI)
   * @param {Function} testDiscoverer - Test discoverer class (for DI)
   */
  constructor(
    config = {},
    fileSystem = fs,
    testDiscoverer = TestDiscoverer
  ) {
    // Validate and merge config
    const validation = ConfigValidator.validate({
      test: CONFIG.test,
      game: { ...CONFIG.game, ...config }
    });

    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    this.config = validation.config.game;
    this.testConfig = validation.config.test;
    this.fs = fileSystem;
    this.testDiscoverer = testDiscoverer;
    this.level = 1;
    this.score = 0;
    
    // Determine mode based on environment
    this.mode = process.env.NODE_ENV === 'test' 
      ? new TestMode() 
      : new ProductionMode();
  }

  /**
   * Start the game
   * @param {GameMode} mode - Optional mode override
   * @returns {Object} Game state
   */
  start(mode = null) {
    try {
      const activeMode = mode || this.mode;
      return activeMode.start(this);
    } catch (error) {
      console.error('Game startup failed:', error.message);
      return {
        error: error.message,
        status: 'failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Advance to next level
   * @returns {number} New level
   * @throws {RangeError} If maximum level reached
   */
  nextLevel() {
    try {
      if (this.level >= this.config.maxLevel) {
        throw new RangeError(
          `Maximum level ${this.config.maxLevel} reached. Cannot advance further.`
        );
      }
      
      this.level++;
      this.score += this.config.scoreIncrement || 100;
      return this.level;
    } catch (error) {
      console.error('Failed to advance level:', error.message);
      throw error; // Re-throw after logging
    }
  }

  /**
   * Reset game state
   * @returns {Object} Reset state
   */
  reset() {
    this.level = 1;
    this.score = 0;
    return this._getInitialState();
  }

  /**
   * Get current game state
   * @returns {Object} Current state
   */
  getState() {
    return {
      level: this.level,
      score: this.score,
      maxLevel: this.config.maxLevel,
      title: this.config.title,
      version: this.config.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get initial game state
   * @private
   * @returns {Object} Initial state
   */
  _getInitialState() {
    return {
      level: this.level,
      score: this.score,
      status: 'active',
      title: this.config.title,
      version: this.config.version,
      maxLevel: this.config.maxLevel,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set game mode
   * @param {string} mode - 'production' or 'test'
   */
  setMode(mode) {
    switch (mode) {
      case 'production':
        this.mode = new ProductionMode();
        break;
      case 'test':
        this.mode = new TestMode();
        break;
      default:
        throw new Error(`Invalid mode: ${mode}. Must be 'production' or 'test'`);
    }
  }
}

// ===== Exports =====
module.exports = {
  GameEngine,
  TestDiscoverer,
  ConfigValidator,
  GlobHelper,
  CONFIG,
  ProductionMode,
  TestMode
};

// ===== CLI Entry Point =====
if (require.main === module) {
  try {
    const game = new GameEngine();
    const state = game.start();
    console.log('Game State:', JSON.stringify(state, null, 2));
    
    // Demo: Advance levels
    console.log('\nAdvancing levels...');
    for (let i = 0; i < 3; i++) {
      try {
        const level = game.nextLevel();
        console.log(`Advanced to level ${level}, Score: ${game.score}`);
      } catch (error) {
        console.error(error.message);
      }
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}