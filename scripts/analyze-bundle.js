#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 Analyzing bundle size...\n')

try {
  // Build the project
  console.log('📦 Building project...')
  execSync('npm run build', { stdio: 'inherit' })
  
  // Analyze bundle
  console.log('\n📊 Analyzing bundle...')
  execSync('npx @next/bundle-analyzer .next/static/chunks', { stdio: 'inherit' })
  
  console.log('\n✅ Bundle analysis complete!')
  console.log('📈 Check the generated HTML file for detailed bundle breakdown')
  
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message)
  process.exit(1)
}
