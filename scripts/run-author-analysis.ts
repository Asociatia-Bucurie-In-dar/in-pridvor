#!/usr/bin/env tsx

/**
 * Run Author Analysis with Environment Setup
 * 
 * This script sets up the environment and runs the author signature analysis
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

// Now import and run the analysis
import('./analyze-author-signatures')
