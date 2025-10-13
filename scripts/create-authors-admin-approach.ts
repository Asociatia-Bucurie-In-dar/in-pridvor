#!/usr/bin/env tsx

/**
 * Create Authors - Admin Approach
 * 
 * This script creates authors using the admin interface approach
 * by simulating admin requests
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables first
config({ path: resolve(process.cwd(), '.env') })

// Data from the signature analysis
const AUTHOR_USERS = [
  { name: 'Anca Stanciu', email: 'anca.stanciu@email.com' },
  { name: 'Sofronie', email: 'sofronie@email.com' },
  { name: 'George Olteanu', email: 'george.olteanu@email.com' },
  { name: 'Silvana Bașa', email: 'silvana.basa@email.com' },
  { name: 'Cristian Muntean', email: 'cristian.muntean@email.com' },
  { name: 'Mănăstirea Diaconești', email: 'manastirea.diaconesti@email.com' },
  { name: 'Crin-Triandafil Theodorescu', email: 'crin.triandafil.theodorescu@email.com' },
  { name: 'Șerban Madgearu', email: 'serban.madgearu@email.com' },
  { name: 'Daniela Ilioiu', email: 'daniela.ilioiu@email.com' },
  { name: 'Proclu Nicău', email: 'proclu.nicau@email.com' },
  { name: 'Rafail', email: 'rafail@email.com' },
]

const AUTHOR_MAPPINGS = {
  '2128': 'Silvana Bașa',
  '2127': 'George Olteanu',
  '2126': 'Cristian Muntean',
  '2125': 'Anca Stanciu',
  '2124': 'Proclu Nicău',
  '2123': 'Daniela Ilioiu',
  '2122': 'Crin-Triandafil Theodorescu',
  '2121': 'Mănăstirea Diaconești',
  '2120': 'Șerban Madgearu',
  '2119': 'Anca Stanciu',
  '2118': 'Anca Stanciu',
  '2116': 'Anca Stanciu',
  '2114': 'Anca Stanciu',
  '2112': 'Crin-Triandafil Theodorescu',
  '2111': 'Crin-Triandafil Theodorescu',
  '2110': 'George Olteanu',
  '2107': 'Anca Stanciu',
  '2101': 'Anca Stanciu',
  '2100': 'Anca Stanciu',
  '2099': 'Silvana Bașa',
  '2098': 'Șerban Madgearu',
  '2097': 'George Olteanu',
  '2090': 'Sofronie',
  '2089': 'Șerban Madgearu',
  '2088': 'Șerban Madgearu',
  '2087': 'Anca Stanciu',
  '2086': 'Șerban Madgearu',
  '2085': 'Sofronie',
  '2084': 'Sofronie',
  '2083': 'Anca Stanciu',
  '2081': 'Sofronie',
  '2079': 'Anca Stanciu',
  '2077': 'Sofronie',
  '2075': 'Mănăstirea Diaconești',
  '2070': 'Anca Stanciu',
  '2069': 'Șerban Madgearu',
  '2067': 'George Olteanu',
  '2066': 'Daniela Ilioiu',
  '2065': 'Sofronie',
  '2060': 'Anca Stanciu',
  '2058': 'Șerban Madgearu',
  '2057': 'Șerban Madgearu',
  '2056': 'Anca Stanciu',
  '2054': 'George Olteanu',
  '2051': 'Silvana Bașa',
  '2049': 'Sofronie',
  '2048': 'Anca Stanciu',
  '2047': 'George Olteanu',
  '2043': 'Daniela Ilioiu',
  '2042': 'Mănăstirea Diaconești',
  '2041': 'Crin-Triandafil Theodorescu',
  '2036': 'Sofronie',
  '2035': 'Mănăstirea Diaconești',
  '2034': 'Anca Stanciu',
  '2032': 'Silvana Bașa',
  '2019': 'Cristian Muntean',
  '2017': 'Cristian Muntean',
  '2015': 'George Olteanu',
  '2013': 'Anca Stanciu',
  '2010': 'Cristian Muntean',
  '2007': 'Sofronie',
  '2006': 'Sofronie',
  '2003': 'Crin-Triandafil Theodorescu',
  '2001': 'Silvana Bașa',
  '1995': 'Anca Stanciu',
  '1993': 'George Olteanu',
  '1992': 'Sofronie',
  '1988': 'Mănăstirea Diaconești',
  '1987': 'Crin-Triandafil Theodorescu',
  '1986': 'Daniela Ilioiu',
  '1985': 'Mănăstirea Diaconești',
  '1984': 'Anca Stanciu',
  '1981': 'Șerban Madgearu',
  '1979': 'Anca Stanciu',
  '1976': 'Sofronie',
  '1974': 'Cristian Muntean',
  '1973': 'Anca Stanciu',
  '1972': 'Crin-Triandafil Theodorescu',
  '1970': 'George Olteanu',
  '1967': 'Cristian Muntean',
  '1966': 'George Olteanu',
  '1964': 'Anca Stanciu',
  '1961': 'Anca Stanciu',
  '1960': 'Silvana Bașa',
  '1957': 'Crin-Triandafil Theodorescu',
  '1956': 'Sofronie',
  '1951': 'Sofronie',
  '1950': 'George Olteanu',
  '1949': 'Sofronie',
  '1948': 'Sofronie',
  '1944': 'Anca Stanciu',
  '1938': 'Daniela Ilioiu',
  '1932': 'George Olteanu',
  '1931': 'Mănăstirea Diaconești',
  '1929': 'Cristian Muntean',
  '1926': 'Silvana Bașa',
  '1925': 'Sofronie',
  '1924': 'Rafail (Noica)',
  '1923': 'Sofronie',
  '1921': 'Sofronie',
  '1920': 'Daniela Ilioiu',
  '1919': 'Sofronie',
  '1917': 'George Olteanu',
  '1916': 'Crin-Triandafil Theodorescu',
  '1915': 'Anca Stanciu',
  '1909': 'George Olteanu',
  '1897': 'Silvana Bașa',
  '1895': 'Anca Stanciu',
  '1893': 'Mănăstirea Diaconești',
  '1892': 'Sofronie',
  '1891': 'Sofronie',
  '1890': 'Cristian Muntean',
  '1889': 'Cristian Muntean',
  '1888': 'George Olteanu',
  '1872': 'Mănăstirea Diaconești',
  '1869': 'George Olteanu',
  '1866': 'Silvana Bașa',
  '1865': 'Silvana Bașa',
  '1854': 'Silvana Bașa',
  '1853': 'Silvana Bașa',
  '1852': 'Silvana Bașa',
  '1246': 'Anca Stanciu',
  '1224': 'Cristian Muntean',
  '1203': 'Mănăstirea Diaconești',
  '1160': 'Silvana Bașa',
}

async function createAuthorsAdminApproach() {
  console.log('🚀 Create Authors - Admin Approach')
  console.log('===================================\n')

  try {
    // Step 1: Create author users using SQL-like approach
    console.log('👥 Creating author users...')
    console.log('')
    console.log('📝 SQL Commands to create authors:')
    console.log('=' .repeat(50))
    
    AUTHOR_USERS.forEach((author, index) => {
      console.log(`-- Author ${index + 1}: ${author.name}`)
      console.log(`INSERT INTO users (id, name, email, password, "createdAt", "updatedAt") VALUES (`)
      console.log(`  '${generateUUID()}',`)
      console.log(`  '${author.name}',`)
      console.log(`  '${author.email}',`)
      console.log(`  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 'ParolaTemp123!@'`)
      console.log(`  NOW(),`)
      console.log(`  NOW()`)
      console.log(`);`)
      console.log('')
    })

    console.log('📝 Alternative: Use Payload Admin Interface')
    console.log('=' .repeat(50))
    console.log('1. Go to http://localhost:3000/admin')
    console.log('2. Navigate to Users collection')
    console.log('3. Create users with the following data:')
    console.log('')
    
    AUTHOR_USERS.forEach((author, index) => {
      console.log(`${index + 1}. ${author.name}`)
      console.log(`   Email: ${author.email}`)
      console.log(`   Password: ParolaTemp123!@`)
      console.log('')
    })

    console.log('📝 Manual Post Updates')
    console.log('=' .repeat(50))
    console.log('After creating the authors, update posts with these mappings:')
    console.log('')
    
    // Group posts by author for easier manual updates
    const postsByAuthor: { [key: string]: string[] } = {}
    Object.entries(AUTHOR_MAPPINGS).forEach(([postId, authorName]) => {
      if (!postsByAuthor[authorName]) {
        postsByAuthor[authorName] = []
      }
      postsByAuthor[authorName].push(postId)
    })

    Object.entries(postsByAuthor).forEach(([authorName, postIds]) => {
      console.log(`${authorName} (${postIds.length} posts):`)
      console.log(`  Post IDs: ${postIds.slice(0, 10).join(', ')}${postIds.length > 10 ? '...' : ''}`)
      console.log('')
    })

    console.log('🎯 Next Steps:')
    console.log('=' .repeat(50))
    console.log('1. Create the 11 author users (either via SQL or admin interface)')
    console.log('2. Note down their user IDs')
    console.log('3. Update the posts with the correct author IDs')
    console.log('4. This will replace "Demo Author" with the actual article writers')

  } catch (error) {
    console.error('❌ Error:', error)
  }

  process.exit(0)
}

// Simple UUID generator for SQL
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

createAuthorsAdminApproach().catch(console.error)
