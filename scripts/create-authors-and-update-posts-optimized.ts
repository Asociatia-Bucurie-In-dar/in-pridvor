#!/usr/bin/env tsx

/**
 * Create Authors and Update Posts - Optimized
 *
 * This script creates author users and updates posts with proper authors
 * based on the signature analysis results
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

// Data from the signature analysis
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

async function createAuthorsAndUpdatePosts() {
  console.log('🚀 Create Authors and Update Posts - Optimized')
  console.log('===============================================\n')

  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

  try {
    // Step 1: Create author users
    console.log('👥 Creating author users...')
    const createdAuthors: { [key: string]: string } = {} // author name -> user ID

    for (const author of AUTHOR_USERS) {
      try {
        // Check if user already exists
        const existingResponse = await fetch(
          `${baseUrl}/api/users?where[name][equals]=${encodeURIComponent(author.name)}&limit=1`,
        )
        const existingData = await existingResponse.json()

        if (existingData.docs && existingData.docs.length > 0) {
          createdAuthors[author.name] = existingData.docs[0].id
          console.log(`✅ Author already exists: ${author.name} (ID: ${existingData.docs[0].id})`)
        } else {
          // Create new user
          const createResponse = await fetch(`${baseUrl}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: author.name,
              email: author.email,
               password: 'ParolaTemp123!@', // Temporary password for all authors
            }),
          })

          if (createResponse.ok) {
            const newUser = await createResponse.json()
            createdAuthors[author.name] = newUser.id
            console.log(`🆕 Created author: ${author.name} (ID: ${newUser.id})`)
          } else {
            console.error(`❌ Failed to create author ${author.name}: ${createResponse.status}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error creating author ${author.name}:`, error)
      }
    }

    console.log(`\n📊 Created/found ${Object.keys(createdAuthors).length} authors\n`)

    // Step 2: Update posts with proper authors
    console.log('📝 Updating posts with proper authors...')
    let updatedPosts = 0
    let failedUpdates = 0

    for (const [postId, authorName] of Object.entries(AUTHOR_MAPPINGS)) {
      try {
        // Find the author user ID
        const authorUserId = createdAuthors[authorName]

        if (!authorUserId) {
          console.error(`❌ No user ID found for author: ${authorName}`)
          failedUpdates++
          continue
        }

        // Update the post
        const updateResponse = await fetch(`${baseUrl}/api/posts/${postId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authors: [authorUserId],
          }),
        })

        if (updateResponse.ok) {
          updatedPosts++
          if (updatedPosts % 10 === 0) {
            console.log(`📝 Updated ${updatedPosts} posts...`)
          }
        } else {
          console.error(`❌ Failed to update post ${postId}: ${updateResponse.status}`)
          failedUpdates++
        }
      } catch (error) {
        console.error(`❌ Error updating post ${postId}:`, error)
        failedUpdates++
      }
    }

    console.log(`\n🎉 Summary:`)
    console.log(`📊 Authors created/found: ${Object.keys(createdAuthors).length}`)
    console.log(`📝 Posts updated: ${updatedPosts}`)
    console.log(`❌ Failed updates: ${failedUpdates}`)
    console.log(
      `📈 Success rate: ${((updatedPosts / (updatedPosts + failedUpdates)) * 100).toFixed(1)}%`,
    )

    // Show final author statistics
    console.log(`\n👥 Final Authors:`)
    console.log('='.repeat(50))
    for (const [name, userId] of Object.entries(createdAuthors)) {
      const postCount = Object.values(AUTHOR_MAPPINGS).filter((author) => author === name).length
      console.log(`✅ ${name} (${postCount} posts) - ID: ${userId}`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createAuthorsAndUpdatePosts().catch(console.error)
